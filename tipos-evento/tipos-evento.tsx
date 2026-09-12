"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TipoEvento = { id: string; nome: string; requer_paciente: boolean; ativo: boolean };

export default function TiposEvento() {
  const supabase = createClient();
  const [itens, setItens] = useState<TipoEvento[]>([]);
  const [nome, setNome] = useState("");
  const [requerPaciente, setRequerPaciente] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data } = await supabase.from("tipos_evento").select("id, nome, requer_paciente, ativo").order("nome");
    setItens(data ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const { error } = await supabase.from("tipos_evento").insert({ nome, requer_paciente: requerPaciente });
    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }
    setNome("");
    setRequerPaciente(true);
    carregar();
  }

  async function alternarAtivo(t: TipoEvento) {
    await supabase.from("tipos_evento").update({ ativo: !t.ativo }).eq("id", t.id);
    carregar();
  }

  return (
    <div className="container">
      <h1>Tipos de evento da agenda</h1>

      <form onSubmit={adicionar} style={{ marginBottom: 24 }}>
        {erro && <p className="erro">{erro}</p>}
        <label>Nome do tipo (ex: Consulta, Feriado, Visita de fornecedor)</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} required />
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <input
            type="checkbox"
            checked={requerPaciente}
            onChange={(e) => setRequerPaciente(e.target.checked)}
            style={{ width: "auto" }}
          />
          Esse tipo exige selecionar um paciente
        </label>
        <button type="submit" disabled={salvando} style={{ marginTop: 12 }}>
          {salvando ? "Salvando..." : "Adicionar tipo"}
        </button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Exige paciente?</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {itens.map((t) => (
            <tr key={t.id}>
              <td>{t.nome}</td>
              <td>{t.requer_paciente ? "Sim" : "Não"}</td>
              <td>{t.ativo ? "Ativo" : "Inativo"}</td>
              <td>
                <button type="button" onClick={() => alternarAtivo(t)} style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                  {t.ativo ? "Desativar" : "Reativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
