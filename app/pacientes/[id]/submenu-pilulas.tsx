"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import Link from "next/link";

export type ItemSubmenu =
  | { tipo: "painel"; id: string; label: string; conteudo: ReactNode }
  | { tipo: "link"; id: string; label: string; href: string };

const ContextoSubmenu = createContext<{ irPara: (id: string) => void } | null>(null);

// Qualquer componente aninhado dentro de um painel pode chamar isso pra trocar de
// pílula programaticamente (ex: um item da Linha do tempo abrindo a aba certa).
export function useSubmenuPilulas() {
  return useContext(ContextoSubmenu);
}

export default function SubmenuPilulas({
  itens,
  itemInicial,
  cabecalho,
}: {
  itens: ItemSubmenu[];
  itemInicial?: string;
  cabecalho?: ReactNode;
}) {
  const painelInicial = itens.find((i) => i.tipo === "painel" && i.id === itemInicial) as
    | Extract<ItemSubmenu, { tipo: "painel" }>
    | undefined;
  const primeiroPainel = itens.find((i) => i.tipo === "painel") as Extract<ItemSubmenu, { tipo: "painel" }> | undefined;
  const [selecionado, setSelecionado] = useState<string | null>((painelInicial ?? primeiroPainel)?.id ?? null);

  return (
    <ContextoSubmenu.Provider value={{ irPara: setSelecionado }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {cabecalho}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {itens.map((item) => {
            const ativo = item.tipo === "painel" && selecionado === item.id;
            const estilo: React.CSSProperties = {
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: ativo ? 700 : 600,
              color: ativo ? "var(--cor-marca-clara)" : "var(--cor-texto-suave)",
              background: ativo ? "var(--cor-marca-fundo)" : "transparent",
              border: ativo ? "none" : "1px solid var(--cor-borda-input)",
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
            };

            if (item.tipo === "link") {
              return (
                <Link key={item.id} href={item.href} style={estilo}>
                  {item.label}
                </Link>
              );
            }
            return (
              <button key={item.id} type="button" onClick={() => setSelecionado(item.id)} style={estilo}>
                {item.label}
              </button>
            );
          })}
        </div>

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
    </ContextoSubmenu.Provider>
  );
}
