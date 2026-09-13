import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você é um assistente de apoio à decisão clínica. O sistema não tem uma base de referência própria para o exame abaixo, então o médico está pedindo uma interpretação e sugestão de conduta com base só no valor, unidade e faixa de referência informados.

REGRAS OBRIGATÓRIAS:
1. Use SOMENTE os dados fornecidos (nome do exame, valor, unidade, faixa de referência, sexo do paciente se informado). NUNCA invente uma faixa de referência diferente da fornecida.
2. Se os dados forem insuficientes para uma interpretação segura, diga isso claramente.
3. Você é apenas apoio — a decisão final é do médico, que deve revisar tudo antes de usar.
4. Estruture a resposta em duas partes curtas: "INTERPRETAÇÃO" e "SUGESTÃO DE CONDUTA".`;

export async function POST(request: NextRequest) {
  const { nomeExame, valor, unidade, minReferencia, maxReferencia, status, sexoPaciente } = await request.json();

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

  const contexto = `Exame: ${nomeExame}
Valor: ${valor} ${unidade ?? ""}
Faixa de referência (informada pelo laboratório): ${minReferencia ?? "não informado"} a ${maxReferencia ?? "não informado"}
Status calculado: ${status ?? "não calculado"}
Sexo do paciente: ${sexoPaciente ?? "não informado"}`;

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
        max_tokens: 800,
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
