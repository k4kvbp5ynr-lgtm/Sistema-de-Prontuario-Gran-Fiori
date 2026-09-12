"use client";

import { useState } from "react";
import Link from "next/link";

type Paciente = { id: string; nome: string; cpf: string | null };

export default function BuscaPacientes({ pacientes }: { pacientes: Paciente[] }) {
  const [texto, setTexto] = useState("");

  const filtrados = texto.trim()
    ? pacientes.filter((p) => p.nome.toLowerCase().includes(texto.toLowerCase()))
    : pacientes;

  return (
    <div>
      <label>Paciente</label>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Digite o nome para filtrar..."
        style={{ marginBottom: 16 }}
      />

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/pacientes/${p.id}`}>{p.nome}</Link>
              </td>
              <td>{p.cpf ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtrados.length === 0 && <p style={{ color: "#888" }}>Nenhum paciente encontrado.</p>}
    </div>
  );
}
