"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";

export type ItemMenuLateral =
  | { tipo: "painel"; id: string; label: string; icone: string; conteudo: ReactNode }
  | { tipo: "link"; id: string; label: string; icone: string; href: string }
  | { tipo: "acao"; id: string; label: string; icone: string; conteudo: ReactNode }; // ex: botão de sair

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

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 32px)" }}>
      <div
        style={{
          width: 96,
          flexShrink: 0,
          background: "#3d3226",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          paddingTop: 12,
        }}
      >
        {itens.map((item) => {
          if (item.tipo === "link") {
            return (
              <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
                <BotaoMenu icone={item.icone} label={item.label} ativo={false} />
              </Link>
            );
          }
          if (item.tipo === "acao") {
            return (
              <div key={item.id} style={{ marginTop: "auto" }}>
                {item.conteudo}
              </div>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelecionado(item.id)}
              style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}
            >
              <BotaoMenu icone={item.icone} label={item.label} ativo={selecionado === item.id} />
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: 24, overflowX: "auto" }}>
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

function BotaoMenu({ icone, label, ativo }: { icone: string; label: string; ativo: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "12px 4px",
        cursor: "pointer",
        background: ativo ? "#7a5a2f" : "transparent",
        borderLeft: ativo ? "3px solid #d4af6a" : "3px solid transparent",
      }}
    >
      <span style={{ fontSize: "1.4rem" }}>{icone}</span>
      <span style={{ fontSize: "0.65rem", color: "white", textAlign: "center", lineHeight: 1.1 }}>{label}</span>
    </div>
  );
}
