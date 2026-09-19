import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function renovarTokenSeNecessario(supabase: any, conexao: any) {
  const expiraEm = new Date(conexao.expires_at).getTime();
  if (expiraEm > Date.now() + 60_000) return conexao.access_token;

  if (!conexao.refresh_token) throw new Error("Token expirado e sem refresh_token — é preciso reconectar.");

  const resposta = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conexao.refresh_token,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });

  if (!resposta.ok) throw new Error("Falha ao renovar token — é preciso reconectar.");

  const dados = await resposta.json();
  const novoExpiraEm = new Date(Date.now() + dados.expires_in * 1000).toISOString();

  await supabase
    .from("wearable_connections")
    .update({ access_token: dados.access_token, refresh_token: dados.refresh_token ?? conexao.refresh_token, expires_at: novoExpiraEm })
    .eq("paciente_id", conexao.paciente_id)
    .eq("provider", "whoop");

  return dados.access_token;
}

async function buscarWhoop(caminho: string, token: string, inicio: string, fim: string) {
  const url = `https://api.prod.whoop.com/developer/v2/${caminho}?start=${inicio}&end=${fim}&limit=25`;
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    console.log(`[whoop] ERRO em ${caminho} — status ${resposta.status}: ${corpo.slice(0, 300)}`);
    return { dados: [], erro: `${caminho}: status ${resposta.status} — ${corpo.slice(0, 150)}` };
  }
  const dados = await resposta.json();
  console.log(`[whoop] ${caminho} — ${dados.records?.length ?? 0} registro(s)`);
  return { dados: dados.records ?? [], erro: null };
}

export async function POST(request: NextRequest) {
  const { pacienteId } = await request.json();
  if (!pacienteId) return NextResponse.json({ erro: "pacienteId é obrigatório." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });

  const { data: conexao } = await supabase
    .from("wearable_connections")
    .select("*")
    .eq("paciente_id", pacienteId)
    .eq("provider", "whoop")
    .eq("ativo", true)
    .maybeSingle();

  if (!conexao) return NextResponse.json({ erro: "Paciente não tem WHOOP conectado." }, { status: 404 });

  try {
    const token = await renovarTokenSeNecessario(supabase, { ...conexao, paciente_id: pacienteId });

    const fim = new Date().toISOString();
    const inicio = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [cycles, recovery, sleep] = await Promise.all([
      buscarWhoop("cycle", token, inicio, fim),
      buscarWhoop("recovery", token, inicio, fim),
      buscarWhoop("activity/sleep", token, inicio, fim),
    ]);

    const errosApi = [cycles.erro, recovery.erro, sleep.erro].filter(Boolean);
    if (errosApi.length === 3) {
      return NextResponse.json({ erro: "A WHOOP recusou todas as chamadas: " + errosApi.join(" | ") }, { status: 502 });
    }

    if (cycles.dados[0]) console.log("[whoop] amostra cycle:", JSON.stringify(cycles.dados[0]).slice(0, 500));
    if (recovery.dados[0]) console.log("[whoop] amostra recovery:", JSON.stringify(recovery.dados[0]).slice(0, 500));
    if (sleep.dados[0]) console.log("[whoop] amostra sleep:", JSON.stringify(sleep.dados[0]).slice(0, 500));

    const porDia = new Map<string, any>();

    function diaDe(dataIso: string) {
      return dataIso.slice(0, 10);
    }

    for (const c of cycles.dados) {
      const dia = diaDe(c.start);
      const existente = porDia.get(dia) ?? {};
      porDia.set(dia, {
        ...existente,
        activity_score: c.score?.strain ?? existente.activity_score,
        bruto_cycle: c,
      });
    }
    for (const r of recovery.dados) {
      const chave = diaDe(r.created_at ?? new Date().toISOString());
      const existente = porDia.get(chave) ?? {};
      porDia.set(chave, {
        ...existente,
        readiness_score: r.score?.recovery_score ?? existente.readiness_score,
        fc_repouso: r.score?.resting_heart_rate ?? existente.fc_repouso,
        hrv: r.score?.hrv_rmssd_milli ?? (r.score?.hrv_rmssd ? r.score.hrv_rmssd * 1000 : existente.hrv),
        bruto_recovery: r,
      });
    }
    for (const s of sleep.dados) {
      const dia = diaDe(s.start);
      const existente = porDia.get(dia) ?? {};
      const duracaoMs = s.score?.stage_summary?.total_in_bed_time_milli ?? null;
      porDia.set(dia, {
        ...existente,
        sleep_score: s.score?.sleep_performance_percentage ?? existente.sleep_score,
        sono_total_minutos: duracaoMs ? Math.round(duracaoMs / 60000) : existente.sono_total_minutos,
        sono_eficiencia: s.score?.sleep_efficiency_percentage ?? existente.sono_eficiencia,
        bruto_sleep: s,
      });
    }

    const linhas = Array.from(porDia.entries()).map(([dia, dados]) => ({
      paciente_id: pacienteId,
      provider: "whoop",
      data: dia,
      readiness_score: dados.readiness_score ?? null,
      sleep_score: dados.sleep_score ?? null,
      activity_score: dados.activity_score ?? null,
      sono_total_minutos: dados.sono_total_minutos ?? null,
      sono_eficiencia: dados.sono_eficiencia ?? null,
      fc_repouso: dados.fc_repouso ?? null,
      hrv: dados.hrv ?? null,
      spo2: null,
      bruto: { cycle: dados.bruto_cycle, recovery: dados.bruto_recovery, sleep: dados.bruto_sleep },
    }));

    if (linhas.length > 0) {
      const { error: erroUpsert } = await supabase.from("wearable_daily_metrics").upsert(linhas, { onConflict: "paciente_id,provider,data" });
      if (erroUpsert) return NextResponse.json({ erro: "Erro ao salvar métricas: " + erroUpsert.message }, { status: 500 });
    }

    await supabase.from("wearable_connections").update({ ultima_sincronizacao: new Date().toISOString() }).eq("paciente_id", pacienteId).eq("provider", "whoop");

    return NextResponse.json({
      ok: true,
      diasSincronizados: linhas.length,
      avisoParcial: errosApi.length > 0 ? `Algumas chamadas falharam: ${errosApi.join(" | ")}` : null,
    });
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 });
  }
}
