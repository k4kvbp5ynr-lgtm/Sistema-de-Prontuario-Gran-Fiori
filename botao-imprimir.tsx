"use client";

export default function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{ marginTop: 24 }}
    >
      Imprimir / Salvar como PDF
    </button>
  );
}
