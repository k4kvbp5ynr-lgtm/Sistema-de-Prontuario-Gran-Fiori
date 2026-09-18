import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function renovarTokenSeNecessario(supabase: any, conexao: any) {
  const expiraEm = new Date(conexao.expires_at).getTime();
  if (expiraEm > Date.now() + 60_000) return conexao.access_token; // ainda válido por mais de 1 min

  if (!conexao.refresh_token) throw new Error("Token expirado e sem refresh_token — é preciso reconectar.");

  const resposta = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conexao.refresh_token,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });

  if (!resposta.ok) throw new Error("Falha ao renovar token — é preciso reconectar.");

  const dados = await resposta.json();
  const novoExpiraEm = new Date(Date.now() + dados.expires_in * 1000).toISOString();

  await supabase
    .from("wearable_connections")
    .update({ access_token: dados.access_token, refresh_token: dados.refresh_token ?? conexao.refresh_token, expires_at: novoExpiraEm })
    .eq("paciente_id", conexao.paciente_id)
    .eq("provider", "oura");

  return dados.access_token;
}

async function buscarOura(caminho: string, token: string, dataInicio: string, dataFim: string) {
  const url = `https://api.ouraring.com/v2/usercollection/${caminho}?start_date=${dataInicio}&end_date=${dataFim}`;
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    console.log(`[oura] ERRO em ${caminho} — status ${resposta.status}: ${corpo.slice(0, 300)}`);
    return { dados: [], erro: `${caminho}: status ${resposta.status} — ${corpo.slice(0, 150)}` };
  }
  const dados = await resposta.json();
  console.log(`[oura] ${caminho} — ${dados.data?.length ?? 0} registro(s)`);
  return { dados: dados.data ?? [], erro: null };
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
    .eq("provider", "oura")
    .eq("ativo", true)
    .maybeSingle();

  if (!conexao) return NextResponse.json({ erro: "Paciente não tem Oura Ring conectado." }, { status: 404 });

  try {
    const token = await renovarTokenSeNecessario(supabase, { ...conexao, paciente_id: pacienteId });

    const dataFim = new Date().toISOString().slice(0, 10);
    const dataInicio = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [readiness, sleep, activity, spo2] = await Promise.all([
      buscarOura("daily_readiness", token, dataInicio, dataFim),
      buscarOura("daily_sleep", token, dataInicio, dataFim),
      buscarOura("daily_activity", token, dataInicio, dataFim),
      buscarOura("daily_spo2", token, dataInicio, dataFim),
    ]);

    const errosApi = [readiness.erro, sleep.erro, activity.erro, spo2.erro].filter(Boolean);
    if (errosApi.length === 4) {
      // Todas as 4 chamadas falharam — quase certeza de token/escopo inválido, não "sem dados"
      return NextResponse.json({ erro: "A Oura recusou todas as chamadas: " + errosApi.join(" | ") }, { status: 502 });
    }

    if (readiness.dados[0]) console.log("[oura] amostra readiness:", JSON.stringify(readiness.dados[0]).slice(0, 500));
    if (sleep.dados[0]) console.log("[oura] amostra sleep:", JSON.stringify(sleep.dados[0]).slice(0, 500));

    const porDia = new Map<string, any>();
    for (const r of readiness.dados) {
      porDia.set(r.day, { ...porDia.get(r.day), readiness_score: r.score, fc_repouso: r.contributors?.resting_heart_rate ?? null, bruto_readiness: r });
    }
    for (const s of sleep.dados) {
      const existente = porDia.get(s.day) ?? {};
      porDia.set(s.day, {
        ...existente,
        sleep_score: s.score,
        sono_total_minutos: s.total_sleep_duration ? Math.round(s.total_sleep_duration / 60) : existente.sono_total_minutos,
        sono_eficiencia: s.efficiency ?? existente.sono_eficiencia,
        hrv: s.average_hrv ?? existente.hrv,
        fc_repouso: s.lowest_heart_rate ?? existente.fc_repouso,
        bruto_sleep: s,
      });
    }
    for (const a of activity.dados) {
      porDia.set(a.day, { ...porDia.get(a.day), activity_score: a.score, bruto_activity: a });
    }
    for (const sp of spo2.dados) {
      porDia.set(sp.day, { ...porDia.get(sp.day), spo2: sp.spo2_percentage?.average ?? null, bruto_spo2: sp });
    }

    const linhas = Array.from(porDia.entries()).map(([dia, dados]) => ({
      paciente_id: pacienteId,
      provider: "oura",
      data: dia,
      readiness_score: dados.readiness_score ?? null,
      sleep_score: dados.sleep_score ?? null,
      activity_score: dados.activity_score ?? null,
      sono_total_minutos: dados.sono_total_minutos ?? null,
      sono_eficiencia: dados.sono_eficiencia ?? null,
      fc_repouso: dados.fc_repouso ?? null,
      hrv: dados.hrv ?? null,
      spo2: dados.spo2 ?? null,
      bruto: { readiness: dados.bruto_readiness, sleep: dados.bruto_sleep, activity: dados.bruto_activity, spo2: dados.bruto_spo2 },
    }));

    if (linhas.length > 0) {
      const { error: erroUpsert } = await supabase.from("wearable_daily_metrics").upsert(linhas, { onConflict: "paciente_id,provider,data" });
      if (erroUpsert) return NextResponse.json({ erro: "Erro ao salvar métricas: " + erroUpsert.message }, { status: 500 });
    }

    await supabase.from("wearable_connections").update({ ultima_sincronizacao: new Date().toISOString() }).eq("paciente_id", pacienteId).eq("provider", "oura");

    return NextResponse.json({
      ok: true,
      diasSincronizados: linhas.length,
      avisoParcial: errosApi.length > 0 ? `Algumas chamadas falharam: ${errosApi.join(" | ")}` : null,
    });
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 });
  }
}
