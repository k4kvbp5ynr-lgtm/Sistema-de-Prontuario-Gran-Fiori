"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    router.refresh();
    window.location.href = "/pacientes";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--cor-sidebar)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--cor-fundo-card)",
          borderRadius: 16,
          padding: "40px 36px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          border: "1px solid var(--cor-borda)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.png" alt="" style={{ width: 72, height: 72, marginBottom: 12 }} />
          <h1 style={{ fontSize: "1.3rem", margin: "0 0 4px", color: "var(--cor-texto)" }}>Dr. Thiago Casagrande</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--cor-marca)", margin: 0, letterSpacing: 0.5 }}>
            Medicina Regenerativa | Esporte | Dor
          </p>
        </div>

        <form onSubmit={entrar}>
          {erro && <p className="erro" style={{ textAlign: "center" }}>{erro}</p>}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button type="submit" disabled={carregando} style={{ width: "100%", marginTop: 4 }}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--cor-texto-fraco)", marginTop: 24, marginBottom: 0 }}>
          Sistema de Prontuário Eletrônico — Gran Fiori
        </p>
      </div>
    </div>
  );
}
