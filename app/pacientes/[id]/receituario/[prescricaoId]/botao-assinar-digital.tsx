"use client";

import { useState } from "react";

export default function BotaoAssinarDigital({ prescricaoId }: { prescricaoId: string }) {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [assinando, setAssinando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  async function assinar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAssinando(true);
    setLinkGerado(null);
    setLinkCopiado(false);

    try {
      const resposta = await fetch(`/api/assinar/receituario/${prescricaoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(dados.erro ?? "Erro ao assinar o documento.");
        setAssinando(false);
        return;
      }

      setLinkGerado(dados.url);

      try {
        await navigator.clipboard.writeText(dados.url);
        setLinkCopiado(true);
      } catch {
        // Se o navegador bloquear a cópia automática, o link ainda fica visível pra copiar manualmente
      }

      setAssinando(false);
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
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 8, padding: 24, maxWidth: 360, width: "90%" }}
          >
            {!linkGerado ? (
              <form onSubmit={assinar}>
                <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Senha do certificado</h2>
                <p style={{ fontSize: "0.85rem", color: "#666" }}>
                  Digite a senha do seu certificado A1. Ela não é salva em nenhum lugar — usada só nesta assinatura.
                </p>
                {erro && <p className="erro">{erro}</p>}
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus required />
                <button type="submit" disabled={assinando} style={{ marginTop: 12, marginRight: 8 }}>
                  {assinando ? "Assinando..." : "Assinar"}
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
            ) : (
              <div>
                <h2 style={{ fontSize: "1rem", marginTop: 0 }}>
                  {linkCopiado ? "Assinado! Link copiado ✓" : "Assinado!"}
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#666" }}>
                  {linkCopiado
                    ? "É só colar (Ctrl+V ou Cmd+V) direto na conversa do WhatsApp com o paciente. O link vale por 7 dias."
                    : "Seu navegador não deixou copiar automaticamente — copie o link abaixo manualmente."}
                </p>
                <input readOnly value={linkGerado} onClick={(e) => (e.target as HTMLInputElement).select()} style={{ fontSize: "0.8rem" }} />
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <a href={linkGerado} target="_blank" rel="noreferrer">
                    <button type="button">Abrir/baixar PDF</button>
                  </a>
                  <button type="button" onClick={() => setMostrarSenha(false)} style={{ background: "transparent", color: "#666" }}>
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
