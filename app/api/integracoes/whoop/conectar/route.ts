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

  if (!process.env.WHOOP_CLIENT_ID) {
    return NextResponse.json({ erro: "WHOOP_CLIENT_ID não configurado no servidor." }, { status: 500 });
  }
  if (!process.env.SITE_URL) {
    return NextResponse.json({ erro: "SITE_URL não configurado no servidor." }, { status: 500 });
  }

  const redirectUri = `${process.env.SITE_URL}/api/integracoes/whoop/callback`;
  const state = pacienteId;

  const url = new URL("https://api.prod.whoop.com/oauth/oauth2/auth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.WHOOP_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:profile read:body_measurement read:cycles read:recovery read:sleep read:workout offline");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
