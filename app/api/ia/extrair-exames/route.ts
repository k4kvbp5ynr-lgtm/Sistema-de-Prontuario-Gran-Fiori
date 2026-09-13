import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você extrai dados de laudos de exames laboratoriais (PDF) para um sistema de prontuário eletrônico.

REGRAS OBRIGATÓRIAS:
1. Extraia APENAS exames que estejam explicitamente escritos no documento, com o valor numérico exato que aparece. NUNCA invente, estime ou complete um valor que não esteja no documento.

2. CONVERSÃO DE UNIDADE — PASSO A PASSO OBRIGATÓRIO, é o ponto mais importante e mais propenso a erro:
   a. Identifique a unidade usada no laudo (unidade_original) — ela quase sempre aparece ao lado do valor no PDF.
   b. Identifique a unidade implícita na faixa de referência do sistema (ela aparece dentro do texto de "ideal mulheres"/"ideal homens" que você recebeu, ex: "12 a 16 g/dL").
   c. Se as duas unidades forem DIFERENTES (ex: mg/dL vs mmol/L, µg/dL vs nmol/L, UI/L vs U/L com fator diferente, etc.), você DEVE calcular matematicamente o valor convertido usando o fator de conversão correto — nunca copie o valor original para valor_convertido nesse caso. Mostre a conta feita em observacao_conversao (ex: "150 mg/dL × 0,0555 = 8,3 mmol/L").
   d. Se as unidades forem IGUAIS (ou equivalentes), valor_convertido = valor_original, e observacao_conversao pode ficar vazio.
   e. Se você não tiver certeza do fator de conversão correto para um par de unidades, NÃO invente um fator — deixe valor_convertido igual ao valor_original e escreva em observacao_conversao: "unidade diferente da referência (LAUDO) vs (SISTEMA) — conversão não realizada, confirme manualmente." Isso é preferível a uma conversão errada.
   Esse passo é crítico: uma conversão errada ou ausente faz um resultado normal aparecer como alterado (ou vice-versa), o que é um erro clínico grave.

3. Tente identificar a qual marcador da lista de referência do sistema cada exame corresponde (mesmo que o nome esteja abreviado ou por extenso, ex: "Hb" = "Hemoglobina", "TGO" = "AST").

4. Se NÃO conseguir identificar com confiança a qual marcador da lista o exame corresponde: deixe marcador_id vazio, mas preencha nome_extraido_do_laudo, unidade_original, e também min_referencia_livre e max_referencia_livre com a faixa de referência que aparece IMPRESSA NO PRÓPRIO LAUDO para esse exame (não converta nesse caso, pois não há referência do sistema para comparar — apenas reporte a referência do laudo como está).

5. Use a ferramenta registrar_exames_extraidos para reportar todos os exames encontrados no documento.`;

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
            valor_convertido: { type: "number", description: "valor já convertido pra unidade de referência (igual ao original se não precisou converter, ou se a conversão não pôde ser feita com segurança)" },
            observacao_conversao: { type: "string", description: "explicação/conta da conversão de unidade, ou string vazia se não houve conversão" },
            min_referencia_livre: { type: "number", description: "valor mínimo da faixa de referência impressa no próprio laudo (só quando marcador_id não foi identificado)" },
            max_referencia_livre: { type: "number", description: "valor máximo da faixa de referência impressa no próprio laudo (só quando marcador_id não foi identificado)" },
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
        max_tokens: 16000,
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

    if (dados.stop_reason === "max_tokens") {
      return NextResponse.json(
        {
          erro:
            "Esse laudo tem muitos exames e a resposta da IA foi cortada antes de terminar. Tente novamente (às vezes resolve) ou, se persistir, me avise — pode ser necessário dividir o PDF em partes menores.",
        },
        { status: 500 }
      );
    }

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
      min_referencia_livre: item.min_referencia_livre ?? null,
      max_referencia_livre: item.max_referencia_livre ?? null,
    }));

    return NextResponse.json({ exames });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
