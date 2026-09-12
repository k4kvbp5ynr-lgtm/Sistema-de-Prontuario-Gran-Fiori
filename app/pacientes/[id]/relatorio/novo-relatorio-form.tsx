"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Procedimento = { id: string; nome: string; codigo_tuss: string | null; referencia_cbhpm: string | null };
type Regiao = {
  titulo: string;
  sintese: string;
  repercussao: string;
  testes: string;
  solicito: string;
};
type ItemOrcamento = { item: string; referencia: string; valor: string };

export default function NovoRelatorioForm({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [tipo, setTipo] = useState<"regiao_unica" | "solicitacao_multipla">("regiao_unica");
  const [local, setLocal] = useState("Barueri/SP");

  // região única
  const [regiaoTitulo, setRegiaoTitulo] = useState("");
  const [exameReferencia, setExameReferencia] = useState("");
  const [sintese, setSintese] = useState("");
  const [hipoteses, setHipoteses] = useState("");
  const [proposta, setProposta] = useState("");
  const [fundamentacao, setFundamentacao] = useState("");

  // solicitação múltipla
  const [examesReferencia, setExamesReferencia] = useState("");
  const [justificativaGeral, setJustificativaGeral] = useState("");
  const [regioes, setRegioes] = useState<Regiao[]>([
    { titulo: "", sintese: "", repercussao: "", testes: "", solicito: "" },
  ]);

  // compartilhado
  const [catalogo, setCatalogo] = useState<Procedimento[]>([]);
  const [procedimentosSelecionados, setProcedimentosSelecionados] = useState<string[]>([]);
  const [orcamento, setOrcamento] = useState<ItemOrcamento[]>([{ item: "", referencia: "", valor: "" }]);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase
      .from("procedimentos")
      .select("id, nome, codigo_tuss, referencia_cbhpm")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setCatalogo(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternarProcedimento(id: string) {
    setProcedimentosSelecionados((atual) =>
      atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]
    );
  }

  function atualizarRegiao(index: number, campo: keyof Regiao, valor: string) {
    setRegioes((atual) => atual.map((r, i) => (i === index ? { ...r, [campo]: valor } : r)));
  }

  function adicionarRegiao() {
    setRegioes((atual) => [...atual, { titulo: "", sintese: "", repercussao: "", testes: "", solicito: "" }]);
  }

  function removerRegiao(index: number) {
    setRegioes((atual) => atual.filter((_, i) => i !== index));
  }

  function atualizarOrcamento(index: number, campo: keyof ItemOrcamento, valor: string) {
    setOrcamento((atual) => atual.map((o, i) => (i === index ? { ...o, [campo]: valor } : o)));
  }

  function adicionarOrcamento() {
    setOrcamento((atual) => [...atual, { item: "", referencia: "", valor: "" }]);
  }

  function removerOrcamento(index: number) {
    setOrcamento((atual) => atual.filter((_, i) => i !== index));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
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

    const dados =
      tipo === "regiao_unica"
        ? {
            regiao: regiaoTitulo,
            exame_referencia: exameReferencia,
            sintese,
            hipoteses,
            proposta,
            fundamentacao,
          }
        : {
            exames_referencia: examesReferencia,
            justificativa_geral: justificativaGeral,
            regioes,
          };

    const procedimentosTuss = catalogo
      .filter((p) => procedimentosSelecionados.includes(p.id))
      .map((p) => ({ nome: p.nome, codigo_tuss: p.codigo_tuss, referencia_cbhpm: p.referencia_cbhpm }));

    const orcamentoFinal = orcamento
      .filter((o) => o.item.trim())
      .map((o) => ({ ...o, valor: o.valor ? parseFloat(o.valor.replace(",", ".")) : null }));

    const { data: relatorio, error } = await supabase
      .from("relatorios_medicos")
      .insert({
        paciente_id: pacienteId,
        profissional_id: user.id,
        tipo,
        local,
        dados,
        procedimentos_tuss: procedimentosTuss,
        orcamento: orcamentoFinal,
      })
      .select()
      .single();

    setSalvando(false);

    if (error || !relatorio) {
      setErro("Erro ao salvar: " + error?.message);
      return;
    }

    router.push(`/pacientes/${pacienteId}/relatorio/${relatorio.id}`);
  }

  return (
    <form onSubmit={salvar} className="container" style={{ padding: "24px 0" }}>
      <h1>Novo relatório médico</h1>
      {erro && <p className="erro">{erro}</p>}

      <label>Tipo de relatório</label>
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as any)}
        style={{ padding: 8, width: "100%", marginBottom: 16 }}
      >
        <option value="regiao_unica">Relatório de uma região/articulação</option>
        <option value="solicitacao_multipla">Solicitação de procedimentos (múltiplas regiões)</option>
      </select>

      {tipo === "regiao_unica" ? (
        <>
          <label>Região/articulação (ex: Joelho direito)</label>
          <input value={regiaoTitulo} onChange={(e) => setRegiaoTitulo(e.target.value)} required />

          <label>Exame de referência</label>
          <input
            value={exameReferencia}
            onChange={(e) => setExameReferencia(e.target.value)}
            placeholder="Ex: Ressonância magnética do joelho direito - 31/08/2026"
          />

          <label>Síntese clínica e radiológica</label>
          <textarea value={sintese} onChange={(e) => setSintese(e.target.value)} rows={5} style={{ width: "100%", padding: 8, marginBottom: 12 }} />

          <label>Hipóteses diagnósticas (uma por linha)</label>
          <textarea value={hipoteses} onChange={(e) => setHipoteses(e.target.value)} rows={4} style={{ width: "100%", padding: 8, marginBottom: 12 }} />

          <label>Proposta terapêutica</label>
          <textarea value={proposta} onChange={(e) => setProposta(e.target.value)} rows={4} style={{ width: "100%", padding: 8, marginBottom: 12 }} />

          <label>Fundamentação (opcional — ex: resolução CFM)</label>
          <input value={fundamentacao} onChange={(e) => setFundamentacao(e.target.value)} />
        </>
      ) : (
        <>
          <label>Exames de referência</label>
          <input
            value={examesReferencia}
            onChange={(e) => setExamesReferencia(e.target.value)}
            placeholder="Ex: RM joelho direito, tornozelo esquerdo e punho direito - 31/08/2026"
          />

          <label>Justificativa clínica geral</label>
          <textarea
            value={justificativaGeral}
            onChange={(e) => setJustificativaGeral(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 8, marginBottom: 16 }}
          />

          {regioes.map((r, i) => (
            <div key={i} style={{ border: "1px solid #e5e0d8", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b>Região {i + 1}</b>
                {regioes.length > 1 && (
                  <button type="button" onClick={() => removerRegiao(i)} style={{ background: "transparent", color: "#b3261e" }}>
                    remover
                  </button>
                )}
              </div>
              <label>Título (ex: Joelho direito)</label>
              <input value={r.titulo} onChange={(e) => atualizarRegiao(i, "titulo", e.target.value)} />
              <label>Síntese dos achados</label>
              <textarea value={r.sintese} onChange={(e) => atualizarRegiao(i, "sintese", e.target.value)} rows={3} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <label>Repercussão clínica</label>
              <textarea value={r.repercussao} onChange={(e) => atualizarRegiao(i, "repercussao", e.target.value)} rows={2} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <label>Testes semiológicos (texto livre)</label>
              <textarea value={r.testes} onChange={(e) => atualizarRegiao(i, "testes", e.target.value)} rows={3} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
              <label>Solicito</label>
              <input value={r.solicito} onChange={(e) => atualizarRegiao(i, "solicito", e.target.value)} />
            </div>
          ))}
          <button type="button" onClick={adicionarRegiao} style={{ marginBottom: 16 }}>
            + Adicionar região
          </button>
        </>
      )}

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e0d8" }} />
      <label style={{ fontWeight: "bold" }}>Códigos TUSS solicitados</label>
      <div style={{ marginBottom: 16 }}>
        {catalogo.map((p) => (
          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={procedimentosSelecionados.includes(p.id)}
              onChange={() => alternarProcedimento(p.id)}
              style={{ width: "auto" }}
            />
            {p.nome} {p.codigo_tuss ? `(TUSS ${p.codigo_tuss})` : ""}
          </label>
        ))}
      </div>

      <label style={{ fontWeight: "bold" }}>Orçamento do tratamento</label>
      {orcamento.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input placeholder="Item" value={o.item} onChange={(e) => atualizarOrcamento(i, "item", e.target.value)} style={{ flex: 2 }} />
          <input placeholder="Referência" value={o.referencia} onChange={(e) => atualizarOrcamento(i, "referencia", e.target.value)} style={{ flex: 2 }} />
          <input placeholder="Valor" value={o.valor} onChange={(e) => atualizarOrcamento(i, "valor", e.target.value)} style={{ flex: 1 }} />
          {orcamento.length > 1 && (
            <button type="button" onClick={() => removerOrcamento(i)} style={{ background: "transparent", color: "#b3261e" }}>
              x
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={adicionarOrcamento} style={{ marginBottom: 16 }}>
        + Adicionar item ao orçamento
      </button>

      <label>Local de emissão</label>
      <input value={local} onChange={(e) => setLocal(e.target.value)} />

      <button type="submit" disabled={salvando} style={{ marginTop: 16 }}>
        {salvando ? "Salvando..." : "Salvar e visualizar"}
      </button>
    </form>
  );
}
