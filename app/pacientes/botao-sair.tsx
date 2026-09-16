"use client";

import { createClient } from "@/lib/supabase/client";

export default function BotaoSair() {
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={sair}
      style={{
        border: "none",
        background: "none",
        padding: 0,
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 500,
        color: "var(--cor-texto-muito-fraco)",
      }}
    >
      Sair
    </button>
  );
}
