import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// Formata uma data para o padrão exigido pelo iCalendar (UTC, sem separadores)
function formatarDataICS(data: Date) {
  return data.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new Response("Token ausente.", { status: 400 });
  }

  // Usa o cliente público (anon key) — a autorização acontece dentro da função
  // agenda_ics_dados, que valida o token e só então libera os dados (bypass de RLS controlado).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.rpc("agenda_ics_dados", { p_token: token });

  if (error || !data) {
    return new Response("Link inválido.", { status: 403 });
  }

  const eventos = data
    .map((a: any) => {
      const inicio = new Date(a.data_hora);
      const fim = new Date(inicio.getTime() + a.duracao_minutos * 60000);
      return [
        "BEGIN:VEVENT",
        `UID:${a.id}@prontuario-app`,
        `DTSTART:${formatarDataICS(inicio)}`,
        `DTEND:${formatarDataICS(fim)}`,
        `SUMMARY:${a.tipo_atendimento} — ${a.paciente_nome}`,
        `STATUS:${a.status === "cancelado" ? "CANCELLED" : "CONFIRMED"}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prontuario App//PT-BR",
    "CALSCALE:GREGORIAN",
    eventos,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="agenda.ics"',
    },
  });
}
