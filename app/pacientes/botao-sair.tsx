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
      style={{ border: "none", background: "none", padding: 0, cursor: "pointer", width: "100%" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "12px 4px",
          borderLeft: "3px solid transparent",
        }}
      >
        <span style={{ fontSize: "1.4rem" }}>🚪</span>
        <span style={{ fontSize: "0.65rem", color: "var(--cor-erro)", textAlign: "center", lineHeight: 1.1 }}>Sair</span>
      </div>
    </button>
  );
}
