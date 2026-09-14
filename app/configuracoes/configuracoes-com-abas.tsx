"use client";

import { useState, ReactNode } from "react";

export default function ConfiguracoesComAbas({
  assinaturas,
  procedimentos,
  tiposEvento,
  equipe,
}: {
  assinaturas: ReactNode;
  procedimentos: ReactNode | null;
  tiposEvento: ReactNode | null;
  equipe: ReactNode | null;
}) {
  const abas = [
    { id: "assinaturas", label: "Assinaturas", conteudo: assinaturas },
    { id: "procedimentos", label: "Procedimentos", conteudo: procedimentos },
    { id: "tipos-evento", label: "Tipos de evento", conteudo: tiposEvento },
    { id: "equipe", label: "Equipe", conteudo: equipe },
  ].filter((aba) => aba.conteudo !== null);
  const [selecionada, setSelecionada] = useState("assinaturas");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--cor-borda)", marginBottom: 20 }}>
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setSelecionada(aba.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: selecionada === aba.id ? "2px solid var(--cor-marca)" : "2px solid transparent",
              marginBottom: -2,
              padding: "10px 16px",
              fontWeight: selecionada === aba.id ? "bold" : "normal",
              color: selecionada === aba.id ? "var(--cor-marca)" : "var(--cor-texto-suave)",
              cursor: "pointer",
            }}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {abas.map((aba) => (
        <div key={aba.id} style={{ display: selecionada === aba.id ? "block" : "none" }}>
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
