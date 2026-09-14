"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Procedimento = { id: string; nome: string; codigo_tuss: string | null; referencia_cbhpm: string | null; valor: number | null };
type ItemPaciente = {
  id: string;
  status: string;
  data: string;
  valor_cobrado: number | null;
  observacao: string | null;
  procedimentos: Procedimento;
};

export default function ProcedimentosPaciente({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [catalogo, setCatalogo] = useState<Procedimento[]>([]);
  const [itens, setItens] = useState<ItemPaciente[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const [procedimentoId, setProcedimentoId] = useState("");
  const [status, setStatus] = useState("planejado");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [valorCobrado, setValorCobrado] = useState("");
  const [observacao, setObservacao] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  async function carregar() {
    const { data: cat } = await supabase.from("procedimentos").select("id, nome, codigo_tuss, referencia_cbhpm, valor").eq("ativo", true).order("nome");
    setCatalogo(cat ?? []);

    const { data: lista } = await supabase
      .from("procedimentos_paciente")
      .select("id, status, data, valor_cobrado, observacao, procedimentos ( id, nome, codigo_tuss, referencia_cbhpm, valor )")
      .eq("paciente_id", pacienteId)
      .order("data", { ascending: false });

    setItens((lista as any) ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function selecionarProcedimento(id: string) {
    setProcedimentoId(id);
    const p = catalogo.find((c) => c.id === id);
    setValorCobrado(p?.valor != null ? p.valor.toFixed(2).replace(".", ",") : "");
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!procedimentoId) return;
    setErro(null);
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErro("Sessão expirada.");
      setSalvando(false);
      return;
    }

    const { error } = await supabase.from("procedimentos_paciente").insert({
      paciente_id: pacienteId,
      procedimento_id: procedimentoId,
      profissional_id: user.id,
      status,
      data,
      valor_cobrado: valorCobrado ? parseFloat(valorCobrado.replace(",", ".")) : null,
      observacao: observacao || null,
    });

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setProcedimentoId("");
    setValorCobrado("");
    setObservacao("");
    carregar();
  }

  function alternarSelecao(id: string) {
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]));
  }

  async function gerarDocumento(tipo: "previa" | "guia_reembolso") {
    if (selecionados.length === 0) {
      setErro("Selecione pelo menos um procedimento pra gerar o documento.");
      return;
    }
    setErro(null);
    setGerando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const itensSelecionados = itens.filter((i) => selecionados.includes(i.id));
    const itensSnapshot = itensSelecionados.map((i) => ({
      nome: i.procedimentos.nome,
      codigo_tuss: i.procedimentos.codigo_tuss,
      referencia_cbhpm: i.procedimentos.referencia_cbhpm,
      valor: i.valor_cobrado ?? i.procedimentos.valor,
    }));
    const total = itensSnapshot.reduce((soma, i) => soma + (i.valor ?? 0), 0);

    const { data: recibo, error } = await supabase
      .from("recibos")
      .insert({
        paciente_id: pacienteId,
        profissional_id: user.id,
        tipo,
        itens: itensSnapshot,
        valor_total: total,
      })
      .select()
      .single();

    setGerando(false);

    if (error || !recibo) {
      setErro("Erro ao gerar documento: " + error?.message);
      return;
    }

    router.push(`/pacientes/${pacienteId}/recibo/${recibo.id}`);
  }

  return (
    <div
      style={{
        border: "1px solid #e5e0d8",
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        background: "#fbfaf7",
      }}
    >
      <p style={{ fontWeight: "bold", margin: "0 0 8px" }}>Procedimentos (reembolso)</p>

      <form onSubmit={adicionar} style={{ marginBottom: 16 }}>
        {erro && <p className="erro">{erro}</p>}
        <select
          value={procedimentoId}
          onChange={(e) => selecionarProcedimento(e.target.value)}
          style={{ padding: 8, width: "100%", marginBottom: 8 }}
          required
        >
          <option value="">Selecione um procedimento</option>
          {catalogo.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} {p.codigo_tuss ? `(TUSS ${p.codigo_tuss})` : ""}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8, flex: 1 }}>
            <option value="planejado">Planejado (será realizado)</option>
            <option value="realizado">Realizado</option>
          </select>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ flex: 1 }} />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            placeholder="Valor (R$)"
            value={valorCobrado}
            onChange={(e) => setValorCobrado(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            style={{ flex: 2 }}
          />
        </div>

        <button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Adicionar"}
        </button>
      </form>

      {itens.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "#888" }}>Nenhum procedimento registrado ainda.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Procedimento</th>
                <th>TUSS</th>
                <th>Status</th>
                <th>Data</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selecionados.includes(i.id)}
                      onChange={() => alternarSelecao(i.id)}
                    />
                  </td>
                  <td>{i.procedimentos.nome}</td>
                  <td>{i.procedimentos.codigo_tuss ?? "—"}</td>
                  <td>{i.status === "planejado" ? "Planejado" : "Realizado"}</td>
                  <td>{new Date(i.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                  <td>
                    {(i.valor_cobrado ?? i.procedimentos.valor)?.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" onClick={() => gerarDocumento("previa")} disabled={gerando}>
              Gerar prévia de reembolso
            </button>
            <button type="button" onClick={() => gerarDocumento("guia_reembolso")} disabled={gerando}>
              Gerar guia de reembolso
            </button>
          </div>
        </>
      )}
    </div>
  );
}
