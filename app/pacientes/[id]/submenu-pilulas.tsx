"use client";

import { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type ItemSubmenu =
  | { tipo: "painel"; id: string; label: string; conteudo: ReactNode }
  | { tipo: "link"; id: string; label: string; href: string }
  | { tipo: "grupo"; id: string; label: string; itens: { id: string; label: string; conteudo: ReactNode }[] };

const ContextoSubmenu = createContext<{ irPara: (id: string) => void } | null>(null);

// Qualquer componente aninhado dentro de um painel pode chamar isso pra trocar de
// pílula programaticamente (ex: um item da Linha do tempo abrindo a aba certa).
export function useSubmenuPilulas() {
  return useContext(ContextoSubmenu);
}

function todosOsPaineis(itens: ItemSubmenu[]): { id: string; conteudo: ReactNode }[] {
  return itens.flatMap((item) => {
    if (item.tipo === "painel") return [{ id: item.id, conteudo: item.conteudo }];
    if (item.tipo === "grupo") return item.itens.map((sub) => ({ id: sub.id, conteudo: sub.conteudo }));
    return [];
  });
}

function GrupoDropdown({
  item,
  selecionado,
  onEscolher,
}: {
  item: Extract<ItemSubmenu, { tipo: "grupo" }>;
  selecionado: string | null;
  onEscolher: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ativo = item.itens.some((sub) => sub.id === selecionado);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const estiloPilula: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: ativo ? 700 : 600,
    color: ativo ? "var(--cor-marca-clara)" : "var(--cor-texto-suave)",
    background: ativo ? "var(--cor-marca-fundo)" : "transparent",
    border: ativo ? "none" : "1px solid var(--cor-borda-input)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setAberto(!aberto)} style={estiloPilula}>
        {item.label} ▾
      </button>
      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "var(--cor-fundo-card)",
            border: "1px solid var(--cor-borda)",
            borderRadius: 10,
            padding: 4,
            zIndex: 15,
            minWidth: 190,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          }}
        >
          {item.itens.map((sub) => {
            const subAtivo = selecionado === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  onEscolher(sub.id);
                  setAberto(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: subAtivo ? 700 : 500,
                  color: subAtivo ? "var(--cor-marca-clara)" : "var(--cor-texto)",
                  background: subAtivo ? "var(--cor-marca-fundo)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const paineis = todosOsPaineis(itens);
  const painelInicial = paineis.find((p) => p.id === itemInicial);
  const [selecionado, setSelecionado] = useState<string | null>((painelInicial ?? paineis[0])?.id ?? null);

  const itemVoltar = itens.find((i) => i.tipo === "link") as Extract<ItemSubmenu, { tipo: "link" }> | undefined;
  const itensClinicos = itens.filter((i) => i.tipo !== "link");

  return (
    <ContextoSubmenu.Provider value={{ irPara: setSelecionado }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {cabecalho}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
          {itemVoltar && (
            <>
              <Link
                href={itemVoltar.href}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--cor-texto-fraco)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                ← {itemVoltar.label}
              </Link>
              <span style={{ width: 1, height: 20, background: "var(--cor-borda)", flexShrink: 0 }} />
            </>
          )}

          {itensClinicos.map((item) => {
            if (item.tipo === "grupo") {
              return <GrupoDropdown key={item.id} item={item} selecionado={selecionado} onEscolher={setSelecionado} />;
            }

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
              whiteSpace: "nowrap",
              flexShrink: 0,
            };

            return (
              <button key={item.id} type="button" onClick={() => setSelecionado(item.id)} style={estilo}>
                {item.label}
              </button>
            );
          })}
        </div>

        {paineis.map((p) => (
          <div key={p.id} style={{ display: selecionado === p.id ? "block" : "none" }}>
            {p.conteudo}
          </div>
        ))}
      </div>
    </ContextoSubmenu.Provider>
  );
}
