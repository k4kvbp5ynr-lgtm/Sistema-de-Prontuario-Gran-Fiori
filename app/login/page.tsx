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
        background: "#0b1214",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 352,
          background: "var(--cor-fundo-card)",
          borderRadius: 18,
          padding: "34px 30px",
          border: "1px solid #223335",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <img src="/logo.png" alt="" style={{ width: 60, height: 60, marginBottom: 14, objectFit: "contain" }} />
          <h1 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", color: "var(--cor-texto)" }}>Dr. Thiago Casagrande</h1>
          <p style={{ fontSize: 12, color: "var(--cor-texto-fraco)", margin: 0 }}>Medicina Regenerativa · Esporte · Dor</p>
        </div>

        <form onSubmit={entrar} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {erro && <p className="erro" style={{ textAlign: "center" }}>{erro}</p>}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ borderRadius: 12 }}
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={{ borderRadius: 12 }}
          />
          <button type="submit" disabled={carregando} style={{ width: "100%", marginTop: 6, borderRadius: 12 }}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--cor-texto-muito-fraco)", margin: 0 }}>
          Prontuário eletrônico · Gran Fiori
        </p>
      </div>
    </div>
  );
}
