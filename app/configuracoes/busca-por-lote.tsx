"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function BuscaPorLote() {
  const supabase = createClient();
  const [lote, setLote] = useState("");
  const [resultados, setResultados] = useState<any[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!lote.trim()) return;
    setBuscando(true);
    const { data } = await supabase
      .from("procedimentos_realizados")
      .select("id, nome_procedimento, produto, lote, data_procedimento, pacientes(id, nome, telefone)")
      .ilike("lote", `%${lote.trim()}%`)
      .order("data_procedimento", { ascending: false });
    setResultados(data ?? []);
    setBuscando(false);
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Rastreabilidade por lote</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
        Em caso de recall de produto, localize todos os pacientes que receberam aquele lote específico.
      </p>
      <form onSubmit={buscar} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Digite o número do lote" style={{ flex: 1 }} />
        <button type="submit" disabled={buscando || !lote.trim()} style={{ fontSize: 12 }}>
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {resultados && resultados.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhum registro encontrado com esse lote.</p>}

      {resultados && resultados.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Telefone</th>
              <th>Procedimento</th>
              <th>Produto</th>
              <th>Lote</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/pacientes/${r.pacientes?.id}`}>{r.pacientes?.nome ?? "—"}</Link>
                </td>
                <td>{r.pacientes?.telefone ?? "—"}</td>
                <td>{r.nome_procedimento}</td>
                <td>{r.produto ?? "—"}</td>
                <td style={{ fontFamily: "var(--fonte-mono)" }}>{r.lote}</td>
                <td>{new Date(r.data_procedimento + "T00:00:00").toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
