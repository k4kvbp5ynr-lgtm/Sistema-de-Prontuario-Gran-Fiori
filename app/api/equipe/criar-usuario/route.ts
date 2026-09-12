import { NextRequest, NextResponse } from "next/server";
import { createClient as createClientSSR } from "@/lib/supabase/server";
import { createClient as createClientAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { email, senha } = await request.json();

  if (!email || !senha) {
    return NextResponse.json({ erro: "E-mail e senha são obrigatórios." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  // 1. Confirma que quem está pedindo é admin, usando a sessão normal do usuário logado
  const supabaseSSR = await createClientSSR();
  const {
    data: { user },
  } = await supabaseSSR.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const { data: souAdmin, error: erroAdmin } = await supabaseSSR.rpc("is_admin");

  if (erroAdmin || !souAdmin) {
    return NextResponse.json({ erro: "Apenas administradores podem criar novos usuários." }, { status: 403 });
  }

  // 2. Só agora usa a chave secreta (nunca chega ao navegador) para criar o login
  const supabaseAdmin = createClientAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: novoUsuario, error: erroCriacao } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (erroCriacao || !novoUsuario.user) {
    return NextResponse.json({ erro: "Erro ao criar login: " + erroCriacao?.message }, { status: 400 });
  }

  return NextResponse.json({ id: novoUsuario.user.id, email: novoUsuario.user.email });
}
