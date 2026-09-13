"use client";

import { createClient } from "@/lib/supabase/client";

export default function BotaoSair() {
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={sair} style={{ background: "#b3261e" }}>
      Sair
    </button>
  );
}
