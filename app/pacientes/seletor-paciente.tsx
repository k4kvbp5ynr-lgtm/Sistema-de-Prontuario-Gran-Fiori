"use client";

import { useEffect, useRef, useState } from "react";

type Paciente = { id: string; nome: string };

export default function SeletorPaciente({
  pacientes,
  value,
  onChange,
  placeholder = "Digite o nome do paciente...",
}: {
  pacientes: Paciente[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mantém o texto mostrado sincronizado com o paciente selecionado por fora
  useEffect(() => {
    if (!value) {
      setTexto("");
      return;
    }
    const p = pacientes.find((p) => p.id === value);
    if (p) setTexto(p.nome);
  }, [value, pacientes]);

  // Fecha a lista ao clicar fora
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
    texto.trim().length === 0
      ? pacientes.slice(0, 8)
      : pacientes.filter((p) => p.nome.toLowerCase().includes(texto.toLowerCase())).slice(0, 8);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          if (e.target.value.trim() === "") onChange("");
        }}
        onFocus={() => setAberto(true)}
        placeholder={placeholder}
      />

      {aberto && filtrados.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #e5e0d8",
            borderRadius: 6,
            listStyle: "none",
            margin: 0,
            padding: 4,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {filtrados.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                onChange(p.id);
                setTexto(p.nome);
                setAberto(false);
              }}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                borderRadius: 4,
                fontSize: "0.9rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fbfaf7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {p.nome}
            </li>
          ))}
        </ul>
      )}

      {aberto && texto.trim().length > 0 && filtrados.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #e5e0d8",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: "0.85rem",
            color: "#888",
            zIndex: 20,
          }}
        >
          Nenhum paciente encontrado.
        </div>
      )}
    </div>
  );
}
