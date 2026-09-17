"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Chat from "../chat/chat";

export default function ChatFlutuante() {
  const supabase = createClient();
  const [meuId, setMeuId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);

  async function carregarNaoLidas(id: string) {
    const { count } = await supabase
      .from("mensagens_chat")
      .select("id", { count: "exact", head: true })
      .eq("destinatario_id", id)
      .eq("lida", false);
    setNaoLidas(count ?? 0);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setMeuId(data.user.id);
        carregarNaoLidas(data.user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!meuId) return;
    const canal = supabase
      .channel("chat_flutuante_badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens_chat" }, (payload) => {
        const nova = payload.new as any;
        if (nova.destinatario_id === meuId && !aberto) {
          setNaoLidas((n) => n + 1);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meuId, aberto]);

  function alternar() {
    const novoEstado = !aberto;
    setAberto(novoEstado);
    if (novoEstado) setNaoLidas(0);
  }

  if (!meuId) return null;

  return (
    <>
      <button
        type="button"
        onClick={alternar}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--cor-marca)",
          color: "var(--cor-sobre-marca)",
          border: "none",
          cursor: "pointer",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          zIndex: 40,
        }}
        title="Chat"
      >
        {aberto ? "✕" : "💬"}
        {!aberto && naoLidas > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "var(--cor-erro)",
              color: "white",
              borderRadius: "50%",
              width: 20,
              height: 20,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 440,
            maxWidth: "calc(100vw - 48px)",
            zIndex: 39,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <Chat meuId={meuId} altura="560px" />
        </div>
      )}
    </>
  );
}
