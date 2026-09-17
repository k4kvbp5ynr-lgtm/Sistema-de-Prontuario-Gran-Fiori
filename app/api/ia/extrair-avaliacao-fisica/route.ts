import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const CAMPOS_FERRAMENTA = {
  data_avaliacao: { type: "string", description: "Data do exame, formato YYYY-MM-DD. Null se não encontrada." },
  peso_kg: { type: ["number", "null"] },
  altura_cm: { type: ["number", "null"] },
  circunferencia_abdominal_cm: { type: ["number", "null"] },
  imc: { type: ["number", "null"] },
  taxa_metabolica_basal_kcal: { type: ["number", "null"] },
  massa_gorda_kg: { type: ["number", "null"] },
  percentual_gordura: { type: ["number", "null"] },
  massa_magra_kg: { type: ["number", "null"] },
  percentual_massa_magra: { type: ["number", "null"] },
  massa_muscular_kg: { type: ["number", "null"] },
  percentual_massa_muscular: { type: ["number", "null"] },
  razao_musculo_gordura: { type: ["number", "null"] },
  agua_corporal_total_litros: { type: ["number", "null"] },
  agua_corporal_percentual: { type: ["number", "null"] },
  indice_hidratacao: { type: ["number", "null"] },
  agua_massa_magra_percentual: { type: ["number", "null"] },
  agua_intracelular_litros: { type: ["number", "null"] },
  agua_intracelular_percentual: { type: ["number", "null"] },
  agua_extracelular_litros: { type: ["number", "null"] },
  angulo_fase_graus: { type: ["number", "null"] },
  idade_celular: { type: ["number", "null"] },
  vo2_max: { type: ["number", "null"] },
  fc_limiar: { type: ["number", "null"] },
  fc_maxima: { type: ["number", "null"] },
  recuperacao_fc_60s: {
    type: ["number", "null"],
    description: "Recuperação da frequência cardíaca em 60 segundos após esforço — geralmente um número negativo (queda de bpm).",
  },
  ve_maxima: { type: ["number", "null"] },
  carga_limiar_w: { type: ["number", "null"] },
  carga_maxima_w: { type: ["number", "null"] },
  pressao_sistolica: { type: ["number", "null"] },
  pressao_diastolica: { type: ["number", "null"] },
  condicionamento_fisico: {
    type: ["string", "null"],
    description: "Classificação textual do condicionamento (ex: Atleta, Bom, Regular), se houver.",
  },
};

const SYSTEM_PROMPT = `Você extrai dados estruturados de laudos de avaliação física (bioimpedância e/ou ventilometria/ergoespirometria) para um sistema de prontuário eletrônico.

REGRAS OBRIGATÓRIAS:
1. Preencha APENAS os campos cujo valor você encontrar explicitamente no texto fornecido. Para qualquer campo não encontrado, retorne null.
2. NUNCA invente, estime ou calcule um valor que não esteja explicitamente escrito no texto (exceção: você pode calcular o IMC apenas se peso e altura estiverem no texto e o IMC em si não estiver escrito).
3. Números decimais brasileiros usam vírgula (ex: "26,6%") — converta para ponto (26.6) no resultado.
4. Muitos laudos de bioimpedância desenham a maior parte dos valores como gráficos visuais (gauges), não como texto — é normal e esperado que a maioria dos campos venha null nesse caso. Extraia só o que estiver realmente presente como texto.
5. "Recuperação de FC" ou "Rec. FC" após 60 segundos costuma vir como número negativo (ex: "-33") — preserve o sinal.
6. Se o mesmo dado aparecer mais de uma vez (ex: em páginas diferentes do mesmo laudo), use o mais completo/claro.`;

const TOOL = {
  name: "registrar_avaliacao_fisica",
  description: "Registra os dados estruturados extraídos do laudo de avaliação física.",
  input_schema: {
    type: "object",
    properties: CAMPOS_FERRAMENTA,
    required: [],
  },
};

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "IA não configurada no servidor." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const { data: meuUsuario } = await supabase.from("usuarios").select("pode_usar_ia").eq("id", user.id).single();
  if (meuUsuario && meuUsuario.pode_usar_ia === false) {
    return NextResponse.json({ erro: "Seu usuário não tem permissão para usar recursos de IA." }, { status: 403 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo) {
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  let textoExtraido = "";
  let paginas = 0;
  try {
    const { default: pdfParse } = await import("pdf-parse");
    const resultado = await pdfParse(bytes);
    textoExtraido = resultado.text ?? "";
    paginas = resultado.numpages ?? 0;
  } catch (erro: any) {
    return NextResponse.json({ erro: "Não foi possível ler o texto do PDF: " + erro.message }, { status: 500 });
  }

  const textoLimpo = textoExtraido.replace(/\n{3,}/g, "\n\n").trim();
  const poucoTexto = textoLimpo.length < 150;

  try {
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
        tools: [TOOL],
        tool_choice: { type: "tool", name: "registrar_avaliacao_fisica" },
        messages: [
          {
            role: "user",
            content: `Texto extraído do laudo (${paginas} página(s)):\n\n${
              textoLimpo || "(nenhum texto extraído — provavelmente um laudo majoritariamente gráfico)"
            }`,
          },
        ],
      }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      return NextResponse.json({ erro: `Erro na IA (status ${resposta.status}): ${corpo.slice(0, 300)}` }, { status: 502 });
    }

    const dados = await resposta.json();
    const usoFerramenta = dados.content?.find((c: any) => c.type === "tool_use");
    const extraido = usoFerramenta?.input ?? {};

    const camposPreenchidos = Object.entries(extraido).filter(([, v]) => v != null).length;

    return NextResponse.json({
      extraido,
      camposPreenchidos,
      aviso: poucoTexto
        ? "Este PDF trouxe pouco texto extraível — é provável que a maioria dos valores esteja em gráficos visuais (comum em laudos de bioimpedância). Confira e complete manualmente o que faltar."
        : null,
    });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
