"use client";

import { useState } from "react";

export default function BotaoExportarPdf({ pacienteId }: { pacienteId: string }) {
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const resposta = await fetch(`/api/pacientes/${pacienteId}/exportar-pdf`);
      if (!resposta.ok) {
        alert("Erro ao gerar o PDF do prontuário.");
        setExportando(false);
        return;
      }
      const blob = await resposta.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "prontuario.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Erro de conexão ao gerar o PDF.");
    }
    setExportando(false);
  }

  return (
    <button type="button" onClick={exportar} disabled={exportando} className="botao-secundario" style={{ fontSize: 12 }}>
      {exportando ? "Gerando PDF..." : "Exportar PDF"}
    </button>
  );
}
