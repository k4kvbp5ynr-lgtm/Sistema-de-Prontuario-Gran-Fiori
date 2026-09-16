"use client";

import { useState, ReactNode } from "react";

export default function ConfiguracoesComAbas({
  assinaturas,
  procedimentos,
  tiposEvento,
  equipe,
  rastreabilidade,
  recall,
}: {
  assinaturas: ReactNode;
  procedimentos: ReactNode | null;
  tiposEvento: ReactNode | null;
  equipe: ReactNode | null;
  rastreabilidade: ReactNode | null;
  recall: ReactNode | null;
}) {
  const abas = [
    { id: "assinaturas", label: "Assinaturas", conteudo: assinaturas },
    { id: "procedimentos", label: "Procedimentos", conteudo: procedimentos },
    { id: "tipos-evento", label: "Tipos de evento", conteudo: tiposEvento },
    { id: "equipe", label: "Equipe", conteudo: equipe },
    { id: "rastreabilidade", label: "Rastreabilidade", conteudo: rastreabilidade },
    { id: "recall", label: "Recall", conteudo: recall },
  ].filter((aba) => aba.conteudo !== null);
  const [selecionada, setSelecionada] = useState("assinaturas");

  return (
    <div>
      <div style={{ display: "inline-flex", gap: 0, background: "var(--cor-fundo-card)", borderRadius: 22, padding: 4, marginBottom: 20 }}>
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setSelecionada(aba.id)}
            style={{
              background: selecionada === aba.id ? "var(--cor-marca-fundo)" : "transparent",
              border: "none",
              borderRadius: 18,
              padding: "8px 16px",
              fontWeight: selecionada === aba.id ? 700 : 600,
              fontSize: selecionada === aba.id ? 13 : 12,
              color: selecionada === aba.id ? "var(--cor-marca-clara)" : "#a9b8b6",
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
