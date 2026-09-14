import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

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

3. Tente identificar a qual marcador da lista de referência do sistema cada exame corresponde (mesmo que o nome esteja abreviado ou por extenso, ex: "Hb" = "Hemoglobina", "TGO" = "AST"). Sempre que conseguir identificar com confiança, use a faixa de referência DA BASE DO SISTEMA (convertendo a unidade corretamente conforme a regra 2) — a base do sistema prevalece sobre a referência impressa no laudo.

4. Se NÃO conseguir identificar com confiança a qual marcador da lista o exame corresponde: deixe marcador_id vazio, mas preencha nome_extraido_do_laudo, unidade_original.
   - Preencha min_referencia_livre e max_referencia_livre APENAS se o laudo mostrar uma faixa numérica clara (ex: "10 a 50 mg/dL"). NUNCA preencha com 0 como "valor padrão" quando não souber — nesse caso, deixe os dois campos vazios (não envie o campo, ou envie null).
   - Se a referência do laudo for um limiar (ex: "reagente se ≥ 10", "não reagente se < 10") em vez de uma faixa mín-máx, ou for qualitativa (ex: "reagente/não reagente", "positivo/negativo"), NÃO tente forçar isso em min/max — deixe os campos vazios e escreva a referência textual em observacao_conversao (ex: "Referência do laudo: reagente se ≥ 10 mUI/mL — não é uma faixa numérica, avaliação deve ser manual").

5. IMPORTANTE — SEJA EXAUSTIVO: extraia TODOS OS EXAMES que aparecem no texto, sem exceção, mesmo que pareçam repetidos, triviais, ou que você já tenha visto algo parecido antes. Se o texto tiver 30 exames, sua resposta deve ter 30 itens — nunca resuma, nunca pule um exame achando que não é importante. Isso é especialmente crítico quando o texto for um trecho/parte de um documento maior: processe TUDO que estiver nesse trecho, do início ao fim, sem deixar nada de fora.

6. Use a ferramenta registrar_exames_extraidos para reportar todos os exames encontrados no documento.`;

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

// Linhas boilerplate (repetidas em quase toda página do laudo: cabeçalho, rodapé, legendas,
// dados administrativos, assinaturas, QR code) que não carregam informação de exame nenhuma.
// Remover isso reduz o tamanho do texto mandado pra IA sem tirar nenhum dado clínico.
const PADROES_BOILERPLATE = [
  /^Atendimento ao (cliente|médico)/i,
  /^\(\d{2}\)\s?\d{4}[-\s]?\d{4}/,
  /^www\.\S+/i,
  /^NAM\s*-\s*Núcleo/i,
  /^Legenda aplicável/i,
  /^A interpretação dos resultados/i,
  /^dependem de análise conjunta/i,
  /^Data da geração:/i,
  /^Sob a responsabilidade/i,
  /^Laudo também disponível/i,
  /^Laboratório registrado/i,
  /^Valide seu laudo/i,
  /^valida\.\S+/i,
  /^Token:/i,
  /^Pág\.\s*\d+\s*de\s*\d+/i,
  /^Dentro do intervalo de referência/i,
  /^Assinado eletronicamente por:/i,
  /^Respons[aá]vel:/i,
  /^Locais de Execução/i,
  /^CPF:\s*\d/i,
  /^FAP:\s*\d/i,
  /^DN:\s*\d/i,
  /^Gênero:/i,
  /^Solicitante:/i,
];

function limparTextoLaudo(textoOriginal: string): string {
  const linhas = textoOriginal.split("\n");
  const linhasLimpas = linhas.filter((linha) => {
    const linhaLimpa = linha.trim();
    if (!linhaLimpa) return false;
    return !PADROES_BOILERPLATE.some((padrao) => padrao.test(linhaLimpa));
  });
  return linhasLimpas.join("\n");
}

function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Extrai só a unidade do final de um texto de referência da base, ex: "12 a 16 g/dL" -> "g/dl"
function extrairUnidade(textoReferencia: string | null): string | null {
  if (!textoReferencia) return null;
  const match = textoReferencia.match(/([a-zA-Zµ%0-9\^]+(?:\/[a-zA-Zµ0-9\^]+)?)\s*$/);
  return match ? match[1].toLowerCase().replace(/\s+/g, "") : null;
}

// O pdf-parse costuma separar em 3 linhas: nome / "valor unidade" / "mín a máx unidade"
// (em vez de tudo numa linha só, por causa do layout em colunas do laudo original).
const REGEX_VALOR_UNIDADE = /^(-?\d+[.,]?\d*)\s+([a-zA-Zµ%0-9\^]+(?:\/[a-zA-Zµ0-9\^]+)?)\s*$/;
const REGEX_RANGE = /^(-?\d+[.,]?\d*)\s+(?:a|até)\s+(-?\d+[.,]?\d*)\s*([a-zA-Zµ%0-9\^]+(?:\/[a-zA-Zµ0-9\^]+)?)?\s*$/;
const REGEX_NOME_CANDIDATO = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9°\s\-\(\)\/\.]{1,60}$/;

type ExameResolvidoLocalmente = {
  nome_extraido_do_laudo: string;
  marcador_id: string;
  valor_original: number;
  unidade_original: string;
  valor_convertido: number;
  observacao_conversao: null;
  min_referencia_livre: null;
  max_referencia_livre: null;
  data_exame: string | null;
};

function resolverLocalmente(
  textoLimpo: string,
  marcadores: { id: string; nome: string; valor_ideal_mulheres_texto: string | null; valor_ideal_homens_texto: string | null }[],
  dataExame: string | null
): { resolvidos: ExameResolvidoLocalmente[]; textoRestante: string } {
  const porNomeNormalizado = new Map(marcadores.map((m) => [normalizarNome(m.nome), m]));
  const resolvidos: ExameResolvidoLocalmente[] = [];
  const linhas = textoLimpo.split("\n").map((l) => l.trim());
  const consumida = new Array(linhas.length).fill(false);

  for (let i = 0; i < linhas.length - 2; i++) {
    if (consumida[i]) continue;
    const linhaNome = linhas[i];
    const linhaValor = linhas[i + 1];
    const linhaRange = linhas[i + 2];

    if (!linhaNome || !linhaValor || !linhaRange) continue;
    if (!REGEX_NOME_CANDIDATO.test(linhaNome)) continue;

    const matchValor = linhaValor.match(REGEX_VALOR_UNIDADE);
    const matchRange = linhaRange.match(REGEX_RANGE);
    if (!matchValor || !matchRange) continue;

    const marcador = porNomeNormalizado.get(normalizarNome(linhaNome));
    if (!marcador) continue;

    const [, valorTexto, unidade] = matchValor;
    const [, , , unidadeRange] = matchRange;
    const unidadeFinal = unidadeRange || unidade;
    const unidadeLinha = unidadeFinal.toLowerCase().replace(/\s+/g, "");
    const unidadeBase = extrairUnidade(marcador.valor_ideal_mulheres_texto ?? marcador.valor_ideal_homens_texto ?? null);

    if (unidadeBase && unidadeLinha === unidadeBase) {
      resolvidos.push({
        nome_extraido_do_laudo: linhaNome.trim(),
        marcador_id: marcador.id,
        valor_original: parseFloat(valorTexto.replace(",", ".")),
        unidade_original: unidadeFinal,
        valor_convertido: parseFloat(valorTexto.replace(",", ".")),
        observacao_conversao: null,
        min_referencia_livre: null,
        max_referencia_livre: null,
        data_exame: dataExame,
      });
      consumida[i] = consumida[i + 1] = consumida[i + 2] = true;
      i += 2; // pula as 3 linhas já consumidas
    }
  }

  const linhasRestantes = linhas.filter((_, idx) => !consumida[idx]);
  return { resolvidos, textoRestante: linhasRestantes.join("\n") };
}

function extrairDataColeta(texto: string): string | null {
  const match = texto.match(/DATA\s+(?:DE\s+)?COLETA[^\d]*(\d{2})\/(\d{2})\/(\d{4})/i) || texto.match(/Data\s+da\s+coleta[^\d]*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!match) return null;
  const [, dia, mes, ano] = match;
  return `${ano}-${mes}-${dia}`;
}

export async function POST(request: NextRequest) {
  console.time("[extrair-exames] TOTAL");
  const resumo: Record<string, any> = {};

  const formData = await request.formData();
  const arquivo = formData.get("arquivo") as File | null;

  if (!arquivo) {
    console.timeEnd("[extrair-exames] TOTAL");
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.timeEnd("[extrair-exames] TOTAL");
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const { data: meuUsuario } = await supabase.from("usuarios").select("pode_usar_ia").eq("id", user.id).single();
  if (!meuUsuario?.pode_usar_ia) {
    console.timeEnd("[extrair-exames] TOTAL");
    return NextResponse.json({ erro: "Seu usuário não tem permissão para usar ferramentas de IA." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.timeEnd("[extrair-exames] TOTAL");
    return NextResponse.json({ erro: "A chave da Anthropic ainda não foi configurada no servidor." }, { status: 500 });
  }

  console.time("[extrair-exames] BUSCA_MARCADORES");
  const { data: marcadores } = await supabase
    .from("marcadores_exames")
    .select("id, nome, categoria, valor_ideal_mulheres_texto, valor_ideal_homens_texto")
    .eq("ativo", true);
  console.timeEnd("[extrair-exames] BUSCA_MARCADORES");

  const listaReferencia = (Array.isArray(marcadores) ? marcadores : [])
    .map(
      (m) =>
        `id: ${m.id} | nome: ${m.nome} | categoria: ${m.categoria} | ideal mulheres: ${m.valor_ideal_mulheres_texto} | ideal homens: ${m.valor_ideal_homens_texto}`
    )
    .join("\n");
  resumo.marcadoresNaBase = Array.isArray(marcadores) ? marcadores.length : 0;

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  console.time("[extrair-exames] PDF_EXTRACTION");
  let textoExtraido: string | null = null;
  try {
    const { default: pdfParse } = await import("pdf-parse");
    const resultado = await pdfParse(bytes);
    resumo.pdfPages = resultado.numpages ?? null;
    resumo.originalTextLength = resultado.text?.length ?? 0;
    if (resultado.text && resultado.text.trim().length > 200) {
      textoExtraido = resultado.text;
    }
  } catch (erroExtracao: any) {
    console.log("[extrair-exames] falha ao extrair texto localmente, seguindo com PDF como imagem:", erroExtracao?.message);
  }
  console.timeEnd("[extrair-exames] PDF_EXTRACTION");

  console.time("[extrair-exames] TEXT_CLEANING");
  let textoParaEnviar = textoExtraido;
  if (textoExtraido) {
    textoParaEnviar = limparTextoLaudo(textoExtraido);
    resumo.cleanedTextLength = textoParaEnviar.length;
  }
  console.timeEnd("[extrair-exames] TEXT_CLEANING");

  console.time("[extrair-exames] LOCAL_PARSER");
  let resolvidosLocalmente: ExameResolvidoLocalmente[] = [];
  if (textoParaEnviar) {
    const dataColeta = extrairDataColeta(textoParaEnviar);
    const { resolvidos, textoRestante } = resolverLocalmente(textoParaEnviar, Array.isArray(marcadores) ? marcadores : [], dataColeta);
    resolvidosLocalmente = resolvidos;
    textoParaEnviar = textoRestante;
  }
  resumo.localResultsCount = resolvidosLocalmente.length;
  console.timeEnd("[extrair-exames] LOCAL_PARSER");

  const base64 = bytes.toString("base64");
  const usouTextoOriginalmente = !!textoExtraido;
  resumo.modoEnvio = usouTextoOriginalmente ? "texto" : "pdf_como_imagem";
  resumo.charsSentToAnthropic = textoParaEnviar ? textoParaEnviar.length + listaReferencia.length : 0;

  // Se o parser local já resolveu tudo (raro, mas possível em laudos pequenos e simples),
  // nem precisa chamar a IA.
  if (usouTextoOriginalmente && !textoParaEnviar?.trim()) {
    resumo.anthropicCalls = 0;
    resumo.ambiguousResultsCount = 0;
    resumo.totalExamesExtraidos = resolvidosLocalmente.length;
    resumo.marcadoresIdentificados = resolvidosLocalmente.length;
    console.timeEnd("[extrair-exames] TOTAL");
    console.log("[extrair-exames] resumo:", JSON.stringify(resumo));
    return NextResponse.json({ exames: resolvidosLocalmente });
  }

  resumo.anthropicCalls = 1;

  // Divide o texto em pedaços menores (por linha, sem cortar no meio de uma linha) e chama a IA
  // em paralelo pra cada pedaço — reduz bastante o tempo de espera em laudos grandes, já que
  // várias respostas são geradas ao mesmo tempo em vez de uma atrás da outra.
  const TAMANHO_ALVO_PEDACO = 40000;
  const LINHAS_SOBREPOSICAO = 15; // repete o fim de um pedaço no início do próximo, pra nunca cortar um exame ao meio
  function dividirEmPedacos(texto: string): string[] {
    const linhas = texto.split("\n");
    const pedacos: string[] = [];
    let inicio = 0;
    while (inicio < linhas.length) {
      let fim = inicio;
      let tamanho = 0;
      while (fim < linhas.length && tamanho < TAMANHO_ALVO_PEDACO) {
        tamanho += linhas[fim].length + 1;
        fim++;
      }
      pedacos.push(linhas.slice(inicio, fim).join("\n"));
      if (fim >= linhas.length) break;
      inicio = Math.max(fim - LINHAS_SOBREPOSICAO, inicio + 1);
    }
    return pedacos;
  }

  async function chamarAnthropic(conteudo: any[]) {
    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 32000,
        system: SYSTEM_PROMPT,
        tools: [TOOL_REGISTRAR_EXAMES],
        tool_choice: { type: "tool", name: "registrar_exames_extraidos" },
        messages: [{ role: "user", content: conteudo }],
      }),
    });
    if (!resposta.ok) {
      throw new Error(await resposta.text());
    }
    return resposta.json();
  }

  try {
    // Reativado com instrução de exaustividade mais forte + pedaços maiores (menos divisões,
    // menos risco do "efeito fragmento" que reduziu a completude na primeira tentativa).
    let pedacos: string[] = textoParaEnviar ? dividirEmPedacos(textoParaEnviar) : [];
    if (pedacos.length === 0) pedacos = [""]; // garante ao menos 1 chamada (caso do PDF como imagem)
    resumo.anthropicCalls = pedacos.length;

    console.time("[extrair-exames] ANTHROPIC");
    const respostas = await Promise.allSettled(
      pedacos.map((pedaco) =>
        chamarAnthropic(
          pedaco
            ? [
                { type: "text", text: `Texto extraído do laudo em PDF (parte de um documento maior):\n\n${pedaco}` },
                { type: "text", text: `Lista de marcadores de referência do sistema (use os ids exatos quando houver correspondência):\n\n${listaReferencia}` },
              ]
            : [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                { type: "text", text: `Lista de marcadores de referência do sistema (use os ids exatos quando houver correspondência):\n\n${listaReferencia}` },
              ]
        )
      )
    );
    console.timeEnd("[extrair-exames] ANTHROPIC");

    console.time("[extrair-exames] NORMALIZATION");
    let examesDaIA: any[] = [];
    let algumFalhou = false;
    let algumCortado = false;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const r of respostas) {
      if (r.status === "rejected") {
        algumFalhou = true;
        console.log("[extrair-exames] pedaço falhou:", r.reason?.message);
        continue;
      }
      const dados = r.value;
      totalInputTokens += dados.usage?.input_tokens ?? 0;
      totalOutputTokens += dados.usage?.output_tokens ?? 0;
      if (dados.stop_reason === "max_tokens") {
        algumCortado = true;
        continue;
      }
      const blocoFerramenta = dados.content?.find((b: any) => b.type === "tool_use");
      const examesRaw = blocoFerramenta?.input?.exames;
      if (Array.isArray(examesRaw)) {
        examesDaIA.push(
          ...examesRaw.map((item: any) => ({
            ...item,
            marcador_id: item.marcador_id || null,
            observacao_conversao: item.observacao_conversao || null,
            data_exame: item.data_exame || null,
            min_referencia_livre: item.min_referencia_livre ?? null,
            max_referencia_livre: item.max_referencia_livre ?? null,
          }))
        );
      }
    }

    resumo.inputTokens = totalInputTokens;
    resumo.outputTokens = totalOutputTokens;

    // A sobreposição entre pedaços pode fazer o mesmo exame aparecer 2x — remove duplicata
    // (mesmo nome normalizado + mesmo valor, mantém a primeira ocorrência).
    const vistos = new Set<string>();
    const examesSemDuplicata = examesDaIA.filter((e: any) => {
      const chave = `${normalizarNome(e.nome_extraido_do_laudo || "")}|${e.valor_original}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
    resumo.duplicatasRemovidas = examesDaIA.length - examesSemDuplicata.length;
    examesDaIA = examesSemDuplicata;

    resumo.ambiguousResultsCount = examesDaIA.length;
    resumo.totalExamesExtraidos = examesDaIA.length + resolvidosLocalmente.length;
    resumo.marcadoresIdentificados = examesDaIA.filter((e: any) => e.marcador_id).length + resolvidosLocalmente.length;
    resumo.algumPedacoFalhou = algumFalhou;
    resumo.algumPedacoCortado = algumCortado;
    console.timeEnd("[extrair-exames] NORMALIZATION");
    console.timeEnd("[extrair-exames] TOTAL");
    console.log("[extrair-exames] resumo:", JSON.stringify(resumo));

    if (examesDaIA.length === 0 && resolvidosLocalmente.length === 0) {
      const detalhe = algumCortado
        ? "A resposta da IA foi cortada antes de terminar. Tente novamente."
        : algumFalhou
        ? "Não foi possível consultar a IA. Tente novamente."
        : "A IA não retornou os dados estruturados esperados. Tente novamente.";
      return NextResponse.json({ erro: detalhe }, { status: 500 });
    }

    return NextResponse.json({ exames: [...resolvidosLocalmente, ...examesDaIA] });
  } catch (erro: any) {
    console.timeEnd("[extrair-exames] TOTAL");
    console.log("[extrair-exames] resumo (erro):", JSON.stringify(resumo));
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
