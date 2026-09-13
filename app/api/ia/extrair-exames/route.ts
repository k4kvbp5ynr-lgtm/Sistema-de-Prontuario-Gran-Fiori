import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você extrai dados de laudos de exames laboratoriais (PDF) para um sistema de prontuário eletrônico.

REGRAS OBRIGATÓRIAS:
1. Extraia APENAS exames que estejam explicitamente escritos no documento, com o valor numérico exato que aparece. NUNCA invente, estime ou complete um valor que não esteja no documento.
2. Cada laboratório usa nomenclatura e unidades de medida diferentes para o mesmo exame. Você recebeu uma lista de marcadores de referência do sistema (com o nome padronizado e a faixa de valores ideais, que já indica a unidade padrão usada). Para cada exame do laudo:
   - Tente identificar a qual marcador da lista de referência ele corresponde (mesmo que o nome esteja abreviado ou por extenso, ex: "Hb" = "Hemoglobina", "TGO" = "AST").
   - Se as unidades forem diferentes entre o laudo e a referência, converta o valor para a mesma unidade da referência, e explique a conversão em observacao_conversao.
   - Se não conseguir identificar com confiança a qual marcador da lista corresponde, deixe marcador_id vazio, mas ainda assim preencha nome_extraido_do_laudo.
3. Use a ferramenta registrar_exames_extraidos para reportar todos os exames encontrados no documento.`;

const TOOL_REGISTRAR_EXAMES = {
  name: "registrar_exames_extraidos",
  description: "Registra a lista de exames extraídos do laudo em PDF, um item por exame encontrado.",
  input_schema: {
    type: "object",
    properties: {
      exames: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome_extraido_do_laudo: { type: "string" },
            marcador_id: { type: "string", description: "uuid do marcador de referência correspondente, ou string vazia se não identificado" },
            valor_original: { type: "number" },
            unidade_original: { type: "string" },
            valor_convertido: { type: "number", description: "valor já convertido pra unidade de referência (igual ao original se não precisou converter)" },
            observacao_conversao: { type: "string", description: "explicação da conversão de unidade, ou string vazia se não houve conversão" },
            data_exame: { type: "string", description: "data de coleta no formato YYYY-MM-DD, ou string vazia se não encontrada" },
          },
          required: ["nome_extraido_do_laudo", "valor_original", "valor_convertido"],
        },
      },
    },
    required: ["exames"],
  },
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const arquivo = formData.get("arquivo") as File | null;

  if (!arquivo) {
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "A chave da Anthropic ainda não foi configurada no servidor." }, { status: 500 });
  }

  const { data: marcadores } = await supabase
    .from("marcadores_exames")
    .select("id, nome, categoria, valor_ideal_mulheres_texto, valor_ideal_homens_texto")
    .eq("ativo", true);

  const listaReferencia = (marcadores ?? [])
    .map(
      (m) =>
        `id: ${m.id} | nome: ${m.nome} | categoria: ${m.categoria} | ideal mulheres: ${m.valor_ideal_mulheres_texto} | ideal homens: ${m.valor_ideal_homens_texto}`
    )
    .join("\n");

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const base64 = bytes.toString("base64");

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
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        tools: [TOOL_REGISTRAR_EXAMES],
        tool_choice: { type: "tool", name: "registrar_exames_extraidos" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              {
                type: "text",
                text: `Lista de marcadores de referência do sistema (use os ids exatos quando houver correspondência):\n\n${listaReferencia}`,
              },
            ],
          },
        ],
      }),
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      return NextResponse.json({ erro: "Erro ao consultar a IA: " + erroTexto }, { status: 500 });
    }

    const dados = await resposta.json();
    const blocoFerramenta = dados.content?.find((b: any) => b.type === "tool_use");

    if (!blocoFerramenta) {
      return NextResponse.json(
        { erro: "A IA não retornou os dados estruturados esperados. Tente novamente." },
        { status: 500 }
      );
    }

    const exames = (blocoFerramenta.input?.exames ?? []).map((item: any) => ({
      ...item,
      marcador_id: item.marcador_id || null,
      observacao_conversao: item.observacao_conversao || null,
      data_exame: item.data_exame || null,
    }));

    return NextResponse.json({ exames });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
