import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você extrai dados de laudos de exames laboratoriais (PDF) para um sistema de prontuário eletrônico.

REGRAS OBRIGATÓRIAS:
1. Extraia APENAS exames que estejam explicitamente escritos no documento, com o valor numérico exato que aparece. NUNCA invente, estime ou complete um valor que não esteja no documento.
2. Cada laboratório usa nomenclatura e unidades de medida diferentes para o mesmo exame. Você recebeu uma lista de marcadores de referência do sistema (com o nome padronizado e a faixa de valores ideais, que já indica a unidade padrão usada). Para cada exame do laudo:
   - Tente identificar a qual marcador da lista de referência ele corresponde (mesmo que o nome esteja abreviado ou por extenso, ex: "Hb" = "Hemoglobina", "TGO" = "AST").
   - Se as unidades forem diferentes entre o laudo e a referência, converta o valor para a mesma unidade da referência, e explique a conversão no campo "observacao_conversao".
   - Se não conseguir identificar com confiança a qual marcador da lista corresponde, deixe "marcador_id" como null e preencha "nome_extraido_do_laudo" mesmo assim.
3. Responda APENAS com um JSON válido (sem texto antes ou depois, sem markdown), no formato:
{
  "exames": [
    {
      "nome_extraido_do_laudo": "string",
      "marcador_id": "uuid ou null",
      "nome_marcador_referencia": "string ou null",
      "valor_original": number,
      "unidade_original": "string ou null",
      "valor_convertido": number,
      "observacao_conversao": "string ou null",
      "data_exame": "YYYY-MM-DD ou null (data de coleta, se aparecer no laudo)"
    }
  ]
}`;

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
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
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
    const texto = dados.content?.map((b: any) => b.text ?? "").join("") ?? "{}";

    let extraido;
    try {
      const jsonLimpo = texto.replace(/```json|```/g, "").trim();
      extraido = JSON.parse(jsonLimpo);
    } catch {
      return NextResponse.json({ erro: "A IA retornou um formato inesperado. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json(extraido);
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
