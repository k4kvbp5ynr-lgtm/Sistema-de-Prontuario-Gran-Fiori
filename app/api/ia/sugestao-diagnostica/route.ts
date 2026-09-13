import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você é um assistente de apoio à decisão clínica, usado por um médico dentro de um sistema de prontuário eletrônico.

REGRAS OBRIGATÓRIAS, SEM EXCEÇÃO:
1. Use SOMENTE as informações fornecidas abaixo (evolução clínica e exames do paciente). NUNCA invente, presuma ou complete dados que não estejam explicitamente presentes.
2. Se as informações fornecidas forem insuficientes para uma sugestão fundamentada, diga isso claramente ("dados insuficientes para sugestão") em vez de especular ou gerar uma resposta plausível porém não sustentada pelos dados.
3. Você é apenas uma ferramenta de apoio. A decisão clínica final, o diagnóstico e a conduta são sempre de responsabilidade exclusiva do médico, que deve revisar criticamente tudo antes de usar.
4. Nunca comunique diagnóstico, prognóstico ou conduta diretamente ao paciente — sua resposta é vista apenas pelo médico.
5. Estruture sua resposta em duas seções: "HIPÓTESES DIAGNÓSTICAS" (com o raciocínio baseado nos dados fornecidos) e "SUGESTÃO DE CONDUTA".`;

export async function POST(request: NextRequest) {
  const { pacienteId, motivoAtual, anamneseAtual, exameFisicoAtual } = await request.json();

  if (!pacienteId) {
    return NextResponse.json({ erro: "Paciente não informado." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { erro: "A chave da Anthropic ainda não foi configurada no servidor (ANTHROPIC_API_KEY)." },
      { status: 500 }
    );
  }

  // Busca as últimas evoluções do paciente (histórico) — RLS garante que só quem tem permissão acessa
  const { data: encontros } = await supabase
    .from("encontros")
    .select("data_hora, evolucoes ( motivo_consulta, anamnese, exame_fisico, evolucoes_diagnostico ( diagnostico_cid, conduta ) )")
    .eq("paciente_id", pacienteId)
    .order("data_hora", { ascending: false })
    .limit(5);

  const { data: resultadosExames } = await supabase
    .from("resultados_exames_paciente")
    .select("valor, data_exame, status, marcadores_exames ( nome )")
    .eq("paciente_id", pacienteId)
    .order("data_exame", { ascending: false })
    .limit(20);

  let contexto = "=== EVOLUÇÃO CLÍNICA ATUAL (em preenchimento) ===\n";
  contexto += `Motivo da consulta: ${motivoAtual || "não informado"}\n`;
  contexto += `Anamnese: ${anamneseAtual || "não informado"}\n`;
  contexto += `Exame físico: ${exameFisicoAtual || "não informado"}\n\n`;

  contexto += "=== HISTÓRICO DE CONSULTAS ANTERIORES ===\n";
  if (encontros && encontros.length > 0) {
    for (const enc of encontros as any[]) {
      for (const ev of enc.evolucoes ?? []) {
        contexto += `- Motivo: ${ev.motivo_consulta ?? "—"} | Anamnese: ${ev.anamnese ?? "—"} | Exame físico: ${ev.exame_fisico ?? "—"}\n`;
        for (const d of ev.evolucoes_diagnostico ?? []) {
          contexto += `  Diagnóstico anterior: ${d.diagnostico_cid ?? "—"} | Conduta anterior: ${d.conduta ?? "—"}\n`;
        }
      }
    }
  } else {
    contexto += "Nenhum histórico anterior registrado.\n";
  }

  contexto += "\n=== EXAMES LABORATORIAIS RECENTES ===\n";
  if (resultadosExames && resultadosExames.length > 0) {
    for (const r of resultadosExames as any[]) {
      contexto += `- ${r.marcadores_exames?.nome}: ${r.valor} (${r.status}) em ${r.data_exame}\n`;
    }
  } else {
    contexto += "Nenhum exame laboratorial registrado.\n";
  }

  try {
    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: contexto }],
      }),
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      return NextResponse.json({ erro: "Erro ao consultar a IA: " + erroTexto }, { status: 500 });
    }

    const dados = await resposta.json();
    const texto = dados.content?.map((b: any) => b.text ?? "").join("\n") ?? "";

    return NextResponse.json({ sugestao: texto });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
