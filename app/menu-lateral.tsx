"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export type ItemMenuLateral =
  | { tipo: "painel"; id: string; label: string; icone: string; conteudo: ReactNode }
  | { tipo: "link"; id: string; label: string; icone: string; href: string }
  | { tipo: "acao"; id: string; label: string; icone: string; conteudo: ReactNode }; // ex: botão de sair

function Toggle({ ligado }: { ligado: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 30,
        height: 17,
        borderRadius: 9,
        background: ligado ? "var(--cor-marca)" : "#152325",
        position: "relative",
        transition: "background-color 0.15s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: ligado ? 15 : 2,
          width: 13,
          height: 13,
          borderRadius: 7,
          background: "var(--cor-sobre-marca)",
          transition: "left 0.15s ease",
        }}
      />
    </span>
  );
}

function BotaoTema() {
  const [claro, setClaro] = useState(false);

  useEffect(() => {
    setClaro(document.documentElement.getAttribute("data-theme") === "light");
  }, []);

  function alternar() {
    const novoClaro = !claro;
    setClaro(novoClaro);
    if (novoClaro) {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("tema", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("tema", "dark");
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        background: "var(--cor-fundo-card)",
        border: "none",
        borderRadius: 10,
        padding: "9px 11px",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cor-texto-suave)" }}>Tema escuro</span>
      <Toggle ligado={!claro} />
    </button>
  );
}

function RodapeUsuario() {
  const supabase = createClient();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("usuarios").select("nome").eq("id", user.id).single();
      setNome(data?.nome ?? user.email ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciais = nome
    ? nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "…";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px 0" }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--cor-marca-fundo)",
          color: "var(--cor-marca-clara)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {iniciais}
      </span>
      <div style={{ overflow: "hidden" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--cor-texto)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
          {nome ?? "—"}
        </p>
      </div>
    </div>
  );
}

function useContagemNaoLidas(ativo: boolean) {
  const supabase = createClient();
  const [contagem, setContagem] = useState(0);

  useEffect(() => {
    if (!ativo) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("mensagens_chat")
        .select("id", { count: "exact", head: true })
        .eq("destinatario_id", user.id)
        .eq("lida", false);
      setContagem(count ?? 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  return contagem;
}

export default function MenuLateral({
  itens,
  itemInicial,
  cabecalho,
}: {
  itens: ItemMenuLateral[];
  itemInicial?: string;
  cabecalho?: ReactNode;
}) {
  const painelInicial = itens.find((i) => i.tipo === "painel" && i.id === itemInicial) as
    | Extract<ItemMenuLateral, { tipo: "painel" }>
    | undefined;
  const primeiroPainel = itens.find((i) => i.tipo === "painel") as Extract<ItemMenuLateral, { tipo: "painel" }> | undefined;
  const [selecionado, setSelecionado] = useState<string | null>((painelInicial ?? primeiroPainel)?.id ?? null);
  const itemSair = itens.find((i) => i.tipo === "acao");
  const naoLidas = useContagemNaoLidas(itens.some((i) => i.id === "chat"));

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          width: 228,
          flexShrink: 0,
          background: "var(--cor-sidebar)",
          borderRight: "1px solid var(--cor-borda)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 22px" }}>
          <Image src="/logo.png" alt="" width={34} height={34} style={{ objectFit: "contain" }} />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--cor-texto)" }}>Gran Fiori</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--cor-texto-muito-fraco)" }}>Prontuário</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {itens
            .filter((i) => i.tipo !== "acao")
            .map((item) => {
              const ativo = item.tipo === "painel" && selecionado === item.id;
              const conteudoLinha = (
                <>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: ativo ? "var(--cor-marca)" : "#2a3b3d",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.id === "chat" && naoLidas > 0 && (
                    <span
                      style={{
                        background: "var(--cor-marca)",
                        color: "var(--cor-sobre-marca)",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 9,
                      }}
                    >
                      {naoLidas}
                    </span>
                  )}
                </>
              );
              const estiloLinha: React.CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: ativo ? 600 : 500,
                color: ativo ? "var(--cor-marca-clara)" : "#a9b8b6",
                background: ativo ? "var(--cor-marca-fundo)" : "transparent",
                textDecoration: "none",
                cursor: "pointer",
                border: "none",
                width: "100%",
                textAlign: "left",
              };

              if (item.tipo === "link") {
                return (
                  <Link key={item.id} href={item.href} style={estiloLinha}>
                    {conteudoLinha}
                  </Link>
                );
              }
              return (
                <button key={item.id} type="button" onClick={() => setSelecionado(item.id)} style={estiloLinha}>
                  {conteudoLinha}
                </button>
              );
            })}
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          <BotaoTema />
          <RodapeUsuario />
          <div style={{ padding: "2px 8px 0" }}>{itemSair && itemSair.tipo === "acao" && itemSair.conteudo}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "22px 26px", overflowX: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {cabecalho}
        {itens
          .filter((i) => i.tipo === "painel")
          .map((item) =>
            item.tipo === "painel" ? (
              <div key={item.id} style={{ display: selecionado === item.id ? "block" : "none" }}>
                {item.conteudo}
              </div>
            ) : null
          )}
      </div>
    </div>
  );
}
