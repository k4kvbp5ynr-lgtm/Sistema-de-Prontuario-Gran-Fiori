import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const pacienteId = request.nextUrl.searchParams.get("pacienteId");
  if (!pacienteId) {
    return NextResponse.json({ erro: "pacienteId é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!process.env.OURA_CLIENT_ID) {
    return NextResponse.json({ erro: "OURA_CLIENT_ID não configurado no servidor." }, { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/integracoes/oura/callback`;
  // "state" carrega o paciente que está sendo conectado — o callback usa isso pra saber
  // onde salvar o token. A sessão logada (Supabase) já protege contra CSRF de verdade.
  const state = pacienteId;

  const url = new URL("https://cloud.ouraring.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.OURA_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "daily heartrate personal");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
