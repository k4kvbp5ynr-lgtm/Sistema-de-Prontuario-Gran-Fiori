"use client";

import { useConsultaTimer } from "./consulta-timer-context";

function formatarTempo(segundos: number): string {
  const m = Math.floor(segundos / 60)
    .toString()
    .padStart(2, "0");
  const s = (segundos % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const estiloPilula: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 20,
  border: "1px solid var(--cor-borda-input)",
  fontSize: 13,
  fontFamily: "var(--fonte-mono)",
  fontWeight: 600,
};

export default function TimerConsultaWidget() {
  const { rodando, travado, segundosDecorridos, iniciar } = useConsultaTimer();

  if (travado) {
    return (
      <span style={{ ...estiloPilula, color: "var(--cor-sucesso)", borderColor: "var(--cor-sucesso)" }}>
        Consulta registrada — {formatarTempo(segundosDecorridos)}
      </span>
    );
  }

  if (rodando) {
    return (
      <span style={{ ...estiloPilula, color: "var(--cor-marca-clara)", borderColor: "var(--cor-marca)" }}>
        ◷ {formatarTempo(segundosDecorridos)}
      </span>
    );
  }

  return (
    <button type="button" onClick={iniciar} style={{ fontSize: 13 }}>
      Iniciar consulta
    </button>
  );
}
