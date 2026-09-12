"use client";

import { useState } from "react";

export default function BotaoAssinarDigital({ prescricaoId }: { prescricaoId: string }) {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [assinando, setAssinando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAssinando(true);

    try {
      const resposta = await fetch(`/api/assinar/receituario/${prescricaoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? "Erro ao assinar o documento.");
        setAssinando(false);
        return;
      }

      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "receituario_assinado.pdf";
      link.click();
      URL.revokeObjectURL(url);

      setAssinando(false);
      setMostrarSenha(false);
      setSenha("");
    } catch (e) {
      setErro("Erro de conexão ao tentar assinar.");
      setAssinando(false);
    }
  }

  return (
    <>
      <button type="button" className="no-print" onClick={() => setMostrarSenha(true)} style={{ marginLeft: 8 }}>
        Assinar digitalmente (PDF)
      </button>

      {mostrarSenha && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => !assinando && setMostrarSenha(false)}
        >
          <form
            onSubmit={assinar}
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 8, padding: 24, maxWidth: 340, width: "90%" }}
          >
            <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Senha do certificado</h2>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>
              Digite a senha do seu certificado A1. Ela não é salva em nenhum lugar — usada só nesta assinatura.
            </p>
            {erro && <p className="erro">{erro}</p>}
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" disabled={assinando} style={{ marginTop: 12, marginRight: 8 }}>
              {assinando ? "Assinando..." : "Assinar e baixar PDF"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarSenha(false)}
              disabled={assinando}
              style={{ background: "transparent", color: "#666" }}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
