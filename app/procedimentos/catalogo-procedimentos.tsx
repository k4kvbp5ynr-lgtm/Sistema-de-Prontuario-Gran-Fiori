"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Procedimento = {
  id: string;
  nome: string;
  codigo_tuss: string | null;
  referencia_cbhpm: string | null;
  valor: number | null;
  ativo: boolean;
};

export default function CatalogoProcedimentos() {
  const supabase = createClient();
  const [itens, setItens] = useState<Procedimento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [nome, setNome] = useState("");
  const [codigoTuss, setCodigoTuss] = useState("");
  const [referenciaCbhpm, setReferenciaCbhpm] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase
      .from("procedimentos")
      .select("id, nome, codigo_tuss, referencia_cbhpm, valor, ativo")
      .order("nome");
    setItens(data ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const { error } = await supabase.from("procedimentos").insert({
      nome,
      codigo_tuss: codigoTuss || null,
      referencia_cbhpm: referenciaCbhpm || null,
      valor: valor ? parseFloat(valor.replace(",", ".")) : null,
    });

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setNome("");
    setCodigoTuss("");
    setReferenciaCbhpm("");
    setValor("");
    carregar();
  }

  async function alternarAtivo(p: Procedimento) {
    await supabase.from("procedimentos").update({ ativo: !p.ativo }).eq("id", p.id);
    carregar();
  }

  async function atualizarValor(p: Procedimento, novoValor: string) {
    await supabase
      .from("procedimentos")
      .update({ valor: novoValor ? parseFloat(novoValor.replace(",", ".")) : null })
      .eq("id", p.id);
    carregar();
  }

  return (
    <div className="container">
      <h1>Procedimentos (TUSS / CBHPM)</h1>

      <form onSubmit={adicionar} style={{ marginBottom: 24 }}>
        {erro && <p className="erro">{erro}</p>}
        <label>Nome do procedimento</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} required />
        <label>Código TUSS</label>
        <input value={codigoTuss} onChange={(e) => setCodigoTuss(e.target.value)} />
        <label>Referência CBHPM (opcional)</label>
        <input value={referenciaCbhpm} onChange={(e) => setReferenciaCbhpm(e.target.value)} />
        <label>Valor cobrado (R$)</label>
        <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
        <button type="submit" disabled={salvando} style={{ marginTop: 8 }}>
          {salvando ? "Salvando..." : "Adicionar procedimento"}
        </button>
      </form>

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>TUSS</th>
              <th>CBHPM</th>
              <th>Valor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.codigo_tuss ?? "—"}</td>
                <td>{p.referencia_cbhpm ?? "—"}</td>
                <td>
                  <input
                    defaultValue={p.valor != null ? p.valor.toFixed(2).replace(".", ",") : ""}
                    onBlur={(e) => atualizarValor(p, e.target.value)}
                    style={{ width: 90, padding: 4 }}
                    placeholder="0,00"
                  />
                </td>
                <td>{p.ativo ? "Ativo" : "Inativo"}</td>
                <td>
                  <button type="button" onClick={() => alternarAtivo(p)} style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                    {p.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
