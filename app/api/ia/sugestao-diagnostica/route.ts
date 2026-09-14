import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você é um assistente de apoio à decisão clínica, usado por um médico dentro de um sistema de prontuário eletrônico.

REGRAS OBRIGATÓRIAS, SEM EXCEÇÃO:
1. Baseie o raciocínio clínico SOMENTE nas informações do paciente fornecidas abaixo (evolução clínica e exames). NUNCA invente, presuma ou complete dados do paciente que não estejam explicitamente presentes.
2. Você tem uma ferramenta para buscar artigos médicos no PubMed. Use-a quando for útil para fundamentar a sugestão com evidência científica atual — não é obrigatório em toda consulta, mas é recomendado quando há uma hipótese diagnóstica ou de conduta que se beneficia de respaldo na literatura.
3. Ao usar artigos do PubMed: avalie e mencione a metodologia de cada um antes de usá-lo como respaldo (tipo de estudo — revisão sistemática/meta-análise pesa mais que relato de caso ou opinião —, ano de publicação, periódico). NUNCA cite um artigo sem indicar esse contexto de qualidade da evidência. Resuma os achados com suas próprias palavras, sem reproduzir textos longos do resumo original.
4. Se a busca não retornar nada relevante, ou se os dados do paciente forem insuficientes, diga isso claramente ("dados insuficientes" ou "nenhuma evidência relevante encontrada") em vez de especular.
5. Você é apenas uma ferramenta de apoio. A decisão clínica final, o diagnóstico e a conduta são sempre de responsabilidade exclusiva do médico, que deve revisar criticamente tudo antes de usar.
6. Nunca comunique diagnóstico, prognóstico ou conduta diretamente ao paciente — sua resposta é vista apenas pelo médico.
7. Estruture sua resposta final em três seções: "HIPÓTESES DIAGNÓSTICAS", "SUGESTÃO DE CONDUTA" e, se tiver usado o PubMed, "EVIDÊNCIA CIENTÍFICA CONSULTADA" (com título, periódico, ano, tipo de estudo e um resumo curto de cada artigo usado).`;

const PUBMED_TOOL = {
  name: "buscar_artigos_pubmed",
  description:
    "Busca artigos médicos no PubMed (base de literatura médica dos EUA/NIH) por um termo de busca. Retorna título, periódico, ano, tipo de publicação e resumo de até 5 artigos mais relevantes.",
  input_schema: {
    type: "object",
    properties: {
      termo_busca: {
        type: "string",
        description: "Termo de busca em inglês (PubMed indexa majoritariamente em inglês), ex: 'vitamin D supplementation chronic pain'",
      },
    },
    required: ["termo_busca"],
  },
};

async function buscarPubMed(termoBusca: string) {
  const buscaUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
    termoBusca
  )}&retmode=json&retmax=5&sort=relevance`;
  const buscaResp = await fetch(buscaUrl);
  const buscaDados = await buscaResp.json();
  const ids: string[] = buscaDados.esearchresult?.idlist ?? [];

  if (ids.length === 0) {
    return "Nenhum artigo encontrado para esse termo.";
  }

  const resumoUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(
    ","
  )}&retmode=json`;
  const resumoResp = await fetch(resumoUrl);
  const resumoDados = await resumoResp.json();

  const abstractUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(
    ","
  )}&rettype=abstract&retmode=text`;
  const abstractResp = await fetch(abstractUrl);
  const abstractTexto = await abstractResp.text();

  let resultado = "";
  for (const id of ids) {
    const item = resumoDados.result?.[id];
    if (!item) continue;
    resultado += `\n---\nPMID: ${id}\nTítulo: ${item.title}\nPeriódico: ${item.fulljournalname ?? item.source}\nData: ${item.pubdate}\nTipo de publicação: ${(item.pubtype ?? []).join(", ") || "não especificado"}\n`;
  }
  resultado += `\n\nResumos (abstracts) completos:\n${abstractTexto}`;
  return resultado;
}

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

  const { data: meuUsuario } = await supabase.from("usuarios").select("pode_usar_ia").eq("id", user.id).single();
  if (!meuUsuario?.pode_usar_ia) {
    return NextResponse.json({ erro: "Seu usuário não tem permissão para usar ferramentas de IA." }, { status: 403 });
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
    const messages: any[] = [{ role: "user", content: contexto }];
    let textoFinal = "";
    const MAX_RODADAS = 4;

    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      const resposta = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          tools: [PUBMED_TOOL],
          messages,
        }),
      });

      if (!resposta.ok) {
        const erroTexto = await resposta.text();
        return NextResponse.json({ erro: "Erro ao consultar a IA: " + erroTexto }, { status: 500 });
      }

      const dados = await resposta.json();
      messages.push({ role: "assistant", content: dados.content });

      if (dados.stop_reason === "tool_use") {
        const chamadasFerramenta = dados.content.filter((b: any) => b.type === "tool_use");
        const resultadosFerramenta = [];
        for (const chamada of chamadasFerramenta) {
          const resultadoBusca = await buscarPubMed(chamada.input.termo_busca);
          resultadosFerramenta.push({
            type: "tool_result",
            tool_use_id: chamada.id,
            content: resultadoBusca,
          });
        }
        messages.push({ role: "user", content: resultadosFerramenta });
        continue;
      }

      textoFinal = dados.content?.map((b: any) => b.text ?? "").join("\n") ?? "";
      break;
    }

    return NextResponse.json({ sugestao: textoFinal || "Não foi possível gerar uma resposta." });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
