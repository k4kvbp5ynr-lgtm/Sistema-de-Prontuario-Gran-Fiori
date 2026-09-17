import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Você organiza texto de anamnese ditado por voz durante uma consulta médica, para um sistema de prontuário eletrônico.

REGRAS OBRIGATÓRIAS, SEM EXCEÇÃO:
1. O texto de entrada foi transcrito por reconhecimento de fala e pode ter erros de transcrição, repetições, hesitações e falta de pontuação. Sua tarefa é limpar e organizar — NUNCA adicionar informação clínica que não tenha sido dita.
2. Preserve TODAS as informações clínicas relevantes que foram ditadas. Não pode faltar nada do que foi dito, só reorganizar e corrigir a forma.
3. Corrija apenas problemas óbvios de transcrição (ex: pontuação, palavras claramente mal reconhecidas quando o contexto deixa óbvio o correto). Se uma palavra ficar ambígua ou sem sentido claro, mantenha como está em vez de adivinhar.
4. Organize em texto corrido, claro e profissional, como uma anamnese/exame físico bem escrito — sem inventar seções ou estrutura que não façam sentido com o que foi dito.
5. NÃO adicione diagnóstico, interpretação, hipótese ou conclusão que não tenha sido explicitamente dita pelo médico durante o ditado — isso não é sua função aqui, é só organização de texto.
6. Se o texto ditado for muito curto, incompleto ou não fizer sentido como anamnese, devolva ele com o mínimo de alteração possível, sem tentar completar o que falta.
7. Responda APENAS com o texto final organizado, sem comentários, sem introdução, sem explicações.`;

export async function POST(request: NextRequest) {
  const { texto } = await request.json();

  if (!texto || !texto.trim()) {
    return NextResponse.json({ erro: "Nenhum texto para organizar." }, { status: 400 });
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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Texto ditado por voz:\n\n${texto}` }],
      }),
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      return NextResponse.json({ erro: "Erro ao consultar a IA: " + erroTexto.slice(0, 300) }, { status: 502 });
    }

    const dados = await resposta.json();
    const textoOrganizado = dados.content?.map((b: any) => b.text ?? "").join("\n") ?? "";

    return NextResponse.json({ textoOrganizado: textoOrganizado.trim() || texto });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com a IA: " + erro.message }, { status: 500 });
  }
}
