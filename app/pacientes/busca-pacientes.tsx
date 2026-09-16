"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Paciente = { id: string; nome: string; cpf: string | null };

export default function BuscaPacientes({ pacientes, totalPacientes }: { pacientes: Paciente[]; totalPacientes: number }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const filtrados =
    texto.trim().length === 0 ? [] : pacientes.filter((p) => p.nome.toLowerCase().includes(texto.toLowerCase())).slice(0, 8);

  function iniciais(nome: string) {
    return nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder="Buscar paciente pelo nome..."
          style={{ borderRadius: 24, padding: "12px 90px 12px 18px", marginBottom: 0 }}
        />
        <span
          style={{
            position: "absolute",
            right: 18,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12,
            color: "var(--cor-texto-fraco)",
            fontFamily: "var(--fonte-mono)",
          }}
        >
          {filtrados.length} de {totalPacientes}
        </span>
      </div>

      {aberto && texto.trim().length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--cor-fundo-card)",
            border: "1px solid var(--cor-borda)",
            borderRadius: 14,
            listStyle: "none",
            margin: "4px 0 0",
            padding: 6,
            maxHeight: 320,
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          {filtrados.length > 0 ? (
            filtrados.map((p) => (
              <li
                key={p.id}
                onClick={() => {
                  setAberto(false);
                  router.push(`/pacientes/${p.id}`);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cor-marca-fundo)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "var(--cor-marca-fundo)",
                    color: "var(--cor-marca-clara)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {iniciais(p.nome)}
                </span>
                <span style={{ flex: 1, fontSize: 13 }}>{p.nome}</span>
                <span style={{ color: "var(--cor-texto-fraco)", fontSize: 12, fontFamily: "var(--fonte-mono)" }}>{p.cpf ?? "—"}</span>
              </li>
            ))
          ) : (
            <li style={{ padding: "10px 12px", color: "var(--cor-texto-fraco)", fontSize: "0.85rem" }}>
              Nenhum paciente encontrado.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
