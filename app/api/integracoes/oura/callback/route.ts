import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const pacienteId = request.nextUrl.searchParams.get("state");
  const erroOura = request.nextUrl.searchParams.get("error");

  if (erroOura) {
    return NextResponse.redirect(new URL(`/pacientes/${pacienteId}?erro_oura=${encodeURIComponent(erroOura)}`, request.url));
  }

  if (!code || !pacienteId) {
    return NextResponse.json({ erro: "Parâmetros ausentes no retorno da Oura." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!process.env.OURA_CLIENT_ID || !process.env.OURA_CLIENT_SECRET) {
    return NextResponse.json({ erro: "Credenciais da Oura não configuradas no servidor." }, { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/integracoes/oura/callback`;

  try {
    const respostaToken = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.OURA_CLIENT_ID,
        client_secret: process.env.OURA_CLIENT_SECRET,
      }),
    });

    if (!respostaToken.ok) {
      const corpo = await respostaToken.text();
      return NextResponse.redirect(
        new URL(`/pacientes/${pacienteId}?erro_oura=${encodeURIComponent("Falha ao trocar o código por token: " + corpo.slice(0, 200))}`, request.url)
      );
    }

    const dadosToken = await respostaToken.json();
    const expiresAt = new Date(Date.now() + dadosToken.expires_in * 1000).toISOString();

    const { error: erroSalvar } = await supabase.from("wearable_connections").upsert(
      {
        paciente_id: pacienteId,
        provider: "oura",
        access_token: dadosToken.access_token,
        refresh_token: dadosToken.refresh_token ?? null,
        expires_at: expiresAt,
        conectado_em: new Date().toISOString(),
        ativo: true,
        conectado_por: user.id,
      },
      { onConflict: "paciente_id,provider" }
    );

    if (erroSalvar) {
      return NextResponse.redirect(
        new URL(`/pacientes/${pacienteId}?erro_oura=${encodeURIComponent("Erro ao salvar conexão: " + erroSalvar.message)}`, request.url)
      );
    }

    return NextResponse.redirect(new URL(`/pacientes/${pacienteId}?oura_conectado=1`, request.url));
  } catch (erro: any) {
    return NextResponse.redirect(new URL(`/pacientes/${pacienteId}?erro_oura=${encodeURIComponent(erro.message)}`, request.url));
  }
}
