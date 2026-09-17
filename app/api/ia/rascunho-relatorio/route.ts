import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é um assistente de apoio à redação de relatórios médicos, usado por um médico dentro de um sistema de prontuário eletrônico. Sua tarefa é gerar um RASCUNHO inicial de relatório médico, a partir do histórico já registrado do paciente — nunca a versão final.

REGRAS OBRIGATÓRIAS, SEM EXCEÇÃO:
1. Baseie o rascunho SOMENTE nas informações do paciente fornecidas abaixo. NUNCA invente, presuma ou complete dados clínicos que não estejam explicitamente presentes no histórico.
2. Você tem uma ferramenta para buscar artigos no PubMed — use-a se ajudar a fundamentar a proposta terapêutica com evidência atual. Não é obrigatório.
3. Ao citar um artigo do PubMed, mencione o tipo de estudo e o ano, e resuma com suas próprias palavras — nunca reproduza texto longo do resumo original.
4. Se as informações do paciente forem insuficientes para alguma seção, escreva isso explicitamente na própria seção (ex: "Dados insuficientes no prontuário para propor conduta") em vez de inventar.
5. Ao final, você DEVE chamar a ferramenta "registrar_rascunho_relatorio" exatamente uma vez, com o rascunho estruturado.
6. Todo o conteúdo gerado é um RASCUNHO — o médico é integralmente responsável por revisar, corrigir e completar antes de emitir o relatório de verdade. Deixe isso implícito no tom (proponha, não afirme).`;

const PUBMED_TOOL = {
  name: "buscar_artigos_pubmed",
  description:
    "Busca artigos médicos no PubMed (base de literatura médica dos EUA/NIH) por um termo de busca. Retorna título, periódico, ano, tipo de publicação e resumo de até 5 artigos mais relevantes.",
  input_schema: {
    type: "object",
    properties: {
      termo_busca: { type: "string", description: "Termo de busca em inglês, ex: 'platelet rich plasma knee osteoarthritis'" },
    },
    required: ["termo_busca"],
  },
};

const REGISTRAR_TOOL = {
  name: "registrar_rascunho_relatorio",
  description: "Registra o rascunho estruturado do relatório médico.",
  input_schema: {
    type: "object",
    properties: {
      sintese_clinica: { type: "string", description: "Síntese clínica e radiológica do caso, em texto corrido." },
      hipoteses_diagnosticas: { type: "string", description: "Hipóteses diagnósticas, incluindo código(s) CID quando aplicável." },
      proposta_terapeutica: { type: "string", description: "Proposta terapêutica/conduta sugerida." },
      fundamentacao: { type: "string", description: "Fundamentação com base em evidência científica (PubMed), se consultado. Vazio se não houver." },
    },
    required: ["sintese_clinica", "hipoteses_diagnosticas", "proposta_terapeutica"],
  },
};

async function buscarPubMed(termoBusca: string) {
  try {
    const buscaUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      termoBusca
    )}&retmax=5&sort=relevance&retmode=json`;
    const buscaResposta = await fetch(buscaUrl);
    const buscaDados = await buscaResposta.json();
    const ids: string[] = buscaDados?.esearchresult?.idlist ?? [];
    if (ids.length === 0) return "Nenhum artigo encontrado para esse termo.";

    const resumoUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
    const resumoResposta = await fetch(resumoUrl);
    const resumoDados = await resumoResposta.json();

    const abstractUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=text`;
    const abstractResposta = await fetch(abstractUrl);
    const abstractTexto = await abstractResposta.text();

    const artigos = ids.map((id) => {
      const r = resumoDados.result[id];
      return `Título: ${r.title}\nPeriódico: ${r.fulljournalname ?? r.source}\nAno: ${(r.pubdate ?? "").slice(0, 4)}\nTipo: ${
        (r.pubtype ?? []).join(", ") || "não especificado"
      }`;
    });

    return `${artigos.join("\n\n")}\n\n--- Resumos (abstracts) ---\n${abstractTexto.slice(0, 4000)}`;
  } catch (erro: any) {
    return "Erro ao buscar no PubMed: " + erro.message;
  }
}

export async function POST(request: NextRequest) {
  const { pacienteId } = await request.json();

  if (!pacienteId) {
    return NextResponse.json({ erro: "pacienteId é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const { data: meuUsuario } = await supabase.from("usuarios").select("pode_usar_ia").eq("id", user.id).single();
  if (!meuUsuario?.pode_usar_ia) {
    return NextResponse.json({ erro: "Seu usuário não tem permissão para usar ferramentas de IA." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "A chave da Anthropic ainda não foi configurada no servidor." }, { status: 500 });
  }

  const { data: alergias } = await supabase
    .from("alergias_paciente")
    .select("substancia, reacao, gravidade")
    .eq("paciente_id", pacienteId)
    .eq("ativo", true);

  const { data: medicacoes } = await supabase
    .from("medicacoes_paciente")
    .select("medicamento, dose, frequencia, anticoagulante")
    .eq("paciente_id", pacienteId)
    .eq("ativo", true);

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

  const { data: procedimentos } = await supabase
    .from("procedimentos_realizados")
    .select("nome_procedimento, data_procedimento, observacoes")
    .eq("paciente_id", pacienteId)
    .order("data_procedimento", { ascending: false })
    .limit(10);

  let contexto = "=== SEGURANÇA CLÍNICA ===\n";
  contexto += alergias && alergias.length > 0
    ? alergias.map((a) => `- Alergia: ${a.substancia} (${a.gravidade ?? "gravidade não informada"})`).join("\n")
    : "Nenhuma alergia registrada.";
  contexto += "\n";
  contexto += medicacoes && medicacoes.length > 0
    ? medicacoes.map((m) => `- Medicação em uso: ${m.medicamento} ${m.dose ?? ""}`).join("\n")
    : "Nenhuma medicação em uso registrada.";

  contexto += "\n\n=== HISTÓRICO DE CONSULTAS ===\n";
  if (encontros && encontros.length > 0) {
    for (const enc of encontros as any[]) {
      for (const ev of enc.evolucoes ?? []) {
        contexto += `- ${new Date(enc.data_hora).toLocaleDateString("pt-BR")} — Motivo: ${ev.motivo_consulta ?? "—"} | Anamnese: ${
          ev.anamnese ?? "—"
        } | Exame físico: ${ev.exame_fisico ?? "—"}\n`;
        for (const d of ev.evolucoes_diagnostico ?? []) {
          contexto += `  Diagnóstico: ${d.diagnostico_cid ?? "—"} | Conduta: ${d.conduta ?? "—"}\n`;
        }
      }
    }
  } else {
    contexto += "Nenhum histórico de consulta registrado.\n";
  }

  contexto += "\n=== EXAMES LABORATORIAIS RECENTES ===\n";
  if (resultadosExames && resultadosExames.length > 0) {
    for (const r of resultadosExames as any[]) {
      contexto += `- ${r.marcadores_exames?.nome}: ${r.valor} (${r.status}) em ${r.data_exame}\n`;
    }
  } else {
    contexto += "Nenhum exame laboratorial registrado.\n";
  }

  contexto += "\n=== PROCEDIMENTOS REALIZADOS ===\n";
  if (procedimentos && procedimentos.length > 0) {
    for (const p of procedimentos) {
      contexto += `- ${p.nome_procedimento} em ${p.data_procedimento}${p.observacoes ? ` — ${p.observacoes}` : ""}\n`;
    }
  } else {
    contexto += "Nenhum procedimento registrado.\n";
  }

  try {
    const messages: any[] = [{ role: "user", content: contexto }];
    const MAX_RODADAS = 4;
    let rascunho: any = null;

    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      const resposta = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          tools: [PUBMED_TOOL, REGISTRAR_TOOL],
          messages,
        }),
      });

      if (!resposta.ok) {
        const erroTexto = await resposta.text();
        return NextResponse.json({ erro: "Erro ao consultar a IA: " + erroTexto.slice(0, 300) }, { status: 502 });
      }

      const dados = await resposta.json();
      messages.push({ role: "assistant", content: dados.content });

      const chamadaRegistrar = dados.content?.find((b: any) => b.type === "tool_use" && b.name === "registrar_rascunho_relatorio");
      if (chamadaRegistrar) {
        rascunho = chamadaRegistrar.input;
        break;
      }

      if (dados.stop_reason === "tool_use") {
        const chamadasPubmed = dados.content.filter((b: any) => b.type === "tool_use" && b.name === "buscar_artigos_pubmed");
        const resultadosFerramenta = [];
        for (const chamada of chamadasPubmed) {
          const resultadoBusca = await buscarPubMed(chamada.input.termo_busca);
          resultadosFerramenta.push({ type: "tool_result", tool_use_id: chamada.id, content: resultadoBusca });
        }
        messages.push({ role: "user", content: resultadosFerramenta });
        continue;
      }

      break;
    }

    if (!rascunho) {
      return NextResponse.json({ erro: "Não foi possível gerar o rascunho — tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ rascunho });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
