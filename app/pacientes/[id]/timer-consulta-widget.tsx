"use client";

import { useConsultaTimer } from "./consulta-timer-context";

function formatarTempo(segundos: number): string {
  const m = Math.floor(segundos / 60)
    .toString()
    .padStart(2, "0");
  const s = (segundos % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function TimerConsultaWidget() {
  const { rodando, travado, segundosDecorridos, iniciar } = useConsultaTimer();

  if (travado) {
    return (
      <span style={{ fontSize: "0.85rem", color: "var(--cor-sucesso)", fontWeight: "bold" }}>
        ✓ Consulta registrada — {formatarTempo(segundosDecorridos)}
      </span>
    );
  }

  if (rodando) {
    return (
      <span style={{ fontSize: "0.95rem", color: "var(--cor-marca)", fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>
        ⏱️ {formatarTempo(segundosDecorridos)}
      </span>
    );
  }

  return (
    <button type="button" onClick={iniciar} style={{ fontSize: "0.85rem", background: "var(--cor-sucesso)" }}>
      ▶ Iniciar consulta
    </button>
  );
}
