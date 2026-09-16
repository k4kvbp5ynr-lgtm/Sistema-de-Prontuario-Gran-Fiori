"use client";

import { useState } from "react";
import { useConsultaTimer } from "./consulta-timer-context";

export default function BotaoSalvarConsulta() {
  const { rodando, travado } = useConsultaTimer();
  const [avisando, setAvisando] = useState(false);

  // Já salvou nesta sessão: só libera de novo se iniciar outra consulta.
  if (travado) {
    return (
      <span style={{ fontSize: 12, color: "var(--cor-sucesso)", fontWeight: 600, padding: "8px 14px" }}>
        Consulta salva
      </span>
    );
  }

  if (!rodando) {
    return (
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => {
            setAvisando(true);
            setTimeout(() => setAvisando(false), 4000);
          }}
          className="botao-secundario"
          style={{ cursor: "help" }}
        >
          Salvar consulta
        </button>
        {avisando && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "var(--cor-status-abaixo-fundo)",
              color: "var(--cor-status-abaixo-texto)",
              border: "1px solid var(--cor-status-abaixo-texto)",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              zIndex: 30,
            }}
          >
            Clique em &quot;Iniciar consulta&quot; antes de salvar.
          </div>
        )}
      </div>
    );
  }

  return (
    <button type="submit" form="form-nova-evolucao">
      Salvar consulta
    </button>
  );
}
