"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Paciente = { id: string; nome: string; cpf: string | null };

export default function BuscaPacientes({ pacientes }: { pacientes: Paciente[] }) {
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

  return (
    <div>
      <label>Paciente</label>
      <div ref={containerRef} style={{ position: "relative" }}>
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder="Digite o nome para buscar..."
        />

        {aberto && texto.trim().length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--cor-fundo-card)",
              border: "1px solid var(--cor-borda)",
              borderRadius: 6,
              listStyle: "none",
              margin: 0,
              padding: 4,
              maxHeight: 300,
              overflowY: "auto",
              zIndex: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
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
                    padding: "8px 10px",
                    cursor: "pointer",
                    borderRadius: 4,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cor-fundo-card-alt)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{p.nome}</span>
                  <span style={{ color: "var(--cor-texto-fraco)", fontSize: "0.85rem" }}>{p.cpf ?? "—"}</span>
                </li>
              ))
            ) : (
              <li style={{ padding: "8px 10px", color: "var(--cor-texto-fraco)", fontSize: "0.85rem" }}>
                Nenhum paciente encontrado.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
