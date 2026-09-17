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
    <div style={{ minHeight: "100vh", display: "flex", background: "#070d0e" }}>
      <style>{`
        @keyframes flutuar {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.05); }
        }
        @keyframes pulsar {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.06); }
        }
        @keyframes desenharLinha {
          from { stroke-dashoffset: 1400; }
          to { stroke-dashoffset: 0; }
        }
        .painel-visual { position: relative; overflow: hidden; }
        .orbe { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .helice { animation: desenharLinha 3.5s ease-out forwards; }
        @media (max-width: 860px) {
          .painel-visual { display: none; }
        }
      `}</style>

      {/* Painel visual esquerdo */}
      <div
        className="painel-visual"
        style={{
          flex: 1.15,
          background: "radial-gradient(ellipse at 30% 20%, #123330 0%, #081716 45%, #050b0b 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
        }}
      >
        <div className="orbe" style={{ width: 340, height: 340, background: "#3d9a91", top: -80, left: -60, animation: "flutuar 14s ease-in-out infinite" }} />
        <div className="orbe" style={{ width: 260, height: 260, background: "#c9a15f", bottom: -40, right: -20, opacity: 0.35, animation: "flutuar 18s ease-in-out infinite reverse" }} />

        {/* Ilustração abstrata: dupla hélice / rede celular, em SVG puro */}
        <svg
          viewBox="0 0 400 600"
          style={{ position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)", height: "90%", opacity: 0.5 }}
          fill="none"
        >
          <path
            className="helice"
            d="M60 0 C 220 60, 20 140, 180 200 C 340 260, 140 340, 300 400 C 380 430, 340 500, 260 600"
            stroke="#7fd0c6"
            strokeWidth="1.4"
            strokeDasharray="1400"
          />
          <path
            className="helice"
            d="M180 0 C 20 60, 220 140, 60 200 C -100 260, 100 340, -60 400 C -140 430, -100 500, -20 600"
            stroke="#c9a15f"
            strokeWidth="1.4"
            strokeDasharray="1400"
            style={{ animationDelay: "0.3s" }}
          />
          {[60, 130, 200, 270, 340, 410, 480, 550].map((y, i) => (
            <circle key={i} cx={120 + (i % 2 === 0 ? -10 : 10)} cy={y} r={i % 3 === 0 ? 5 : 3} fill={i % 2 === 0 ? "#7fd0c6" : "#c9a15f"} style={{ animation: `pulsar ${3 + i * 0.4}s ease-in-out infinite` }} />
          ))}
        </svg>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 46 }}>
            <img src="/logo.png" alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e9efee", letterSpacing: 0.3 }}>Gran Fiori</span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 420 }}>
          <p style={{ fontSize: 30, fontWeight: 700, color: "#f2f6f5", lineHeight: 1.25, margin: "0 0 18px", letterSpacing: "-0.01em" }}>
            Medicina regenerativa,{" "}
            <span style={{ color: "#7fd0c6" }}>guiada por precisão.</span>
          </p>
          <p style={{ fontSize: 14, color: "#a9b8b6", lineHeight: 1.6, margin: 0 }}>
            Prontuário eletrônico da clínica — consultas, exames, procedimentos e evolução do paciente num só lugar.
          </p>
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 11, color: "#6d817e" }}>
          © {new Date().getFullYear()} Gran Fiori · Alphaville, Barueri/SP
        </div>
      </div>

      {/* Painel do formulário */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 352 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "radial-gradient(circle, rgba(61,154,145,0.25) 0%, rgba(61,154,145,0) 70%)",
              }}
            >
              <img src="/logo.png" alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "var(--cor-texto)" }}>Dr. Thiago Casagrande</h1>
            <p style={{ fontSize: 12, color: "var(--cor-texto-fraco)", margin: 0 }}>Medicina Regenerativa · Esporte · Dor</p>
          </div>

          <form
            onSubmit={entrar}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              background: "var(--cor-fundo-card)",
              border: "1px solid #223335",
              borderRadius: 18,
              padding: "26px 26px 22px",
            }}
          >
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

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--cor-texto-muito-fraco)", marginTop: 20 }}>
            Prontuário eletrônico · Gran Fiori
          </p>
        </div>
      </div>
    </div>
  );
}
