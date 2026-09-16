"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Procedimento = {
  id: string;
  nome_procedimento: string;
  regiao_anatomica: string | null;
  lateralidade: string | null;
  produto: string | null;
  lote: string | null;
  validade_produto: string | null;
  volume_aplicado: string | null;
  concentracao: string | null;
  via_administracao: string | null;
  guiado_por_usg: boolean;
  data_procedimento: string;
  observacoes: string | null;
};

type Followup = {
  id: string;
  procedimento_id: string | null;
  rotulo: string;
  data_prevista: string;
  status: string;
  observacao: string | null;
  concluido_em: string | null;
};

const VIAS = ["Intra-articular", "Periarticular", "Intramuscular", "Subcutânea", "Peritendínea", "Perineural", "Outra"];

export default function ProcedimentosRealizados({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [lista, setLista] = useState<Procedimento[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [regiao, setRegiao] = useState("");
  const [lateralidade, setLateralidade] = useState("");
  const [produto, setProduto] = useState("");
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const [volume, setVolume] = useState("");
  const [concentracao, setConcentracao] = useState("");
  const [via, setVia] = useState("");
  const [guiadoUsg, setGuiadoUsg] = useState(false);
  const [criarFollowup, setCriarFollowup] = useState(true);
  const [dataProcedimento, setDataProcedimento] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const { data } = await supabase
      .from("procedimentos_realizados")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("data_procedimento", { ascending: false });
    setLista(data ?? []);

    const { data: fups } = await supabase
      .from("tarefas_followup")
      .select("id, procedimento_id, rotulo, data_prevista, status, observacao, concluido_em")
      .eq("paciente_id", pacienteId)
      .order("data_prevista");
    setFollowups(fups ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function limparForm() {
    setNome("");
    setRegiao("");
    setLateralidade("");
    setProduto("");
    setLote("");
    setValidade("");
    setVolume("");
    setConcentracao("");
    setVia("");
    setGuiadoUsg(false);
    setObservacoes("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: procedimentoSalvo, error } = await supabase
      .from("procedimentos_realizados")
      .insert({
        paciente_id: pacienteId,
        profissional_id: user?.id,
        nome_procedimento: nome.trim(),
        regiao_anatomica: regiao || null,
        lateralidade: lateralidade || null,
        produto: produto || null,
        lote: lote || null,
        validade_produto: validade || null,
        volume_aplicado: volume || null,
        concentracao: concentracao || null,
        via_administracao: via || null,
        guiado_por_usg: guiadoUsg,
        data_procedimento: dataProcedimento,
        observacoes: observacoes || null,
        registrado_por: user?.id,
      })
      .select()
      .single();

    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    if (criarFollowup && procedimentoSalvo) {
      const base = new Date(dataProcedimento + "T00:00:00");
      const tarefas = [7, 30, 90].map((dias) => {
        const data = new Date(base);
        data.setDate(data.getDate() + dias);
        return {
          paciente_id: pacienteId,
          procedimento_id: procedimentoSalvo.id,
          rotulo: `Follow-up D+${dias} — ${nome.trim()}`,
          data_prevista: data.toISOString().slice(0, 10),
        };
      });
      await supabase.from("tarefas_followup").insert(tarefas);
    }

    limparForm();
    setFormAberto(false);
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Procedimentos realizados</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", margin: "2px 0 0" }}>
            Protocolo, produto e lote de cada procedimento — histórico clínico e rastreabilidade.
          </p>
        </div>
        <button type="button" onClick={() => setFormAberto(!formAberto)} style={{ fontSize: 12 }}>
          {formAberto ? "Cancelar" : "Registrar procedimento"}
        </button>
      </div>

      {formAberto && (
        <form onSubmit={salvar} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          {erro && <p className="erro">{erro}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11 }}>Procedimento</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Infiltração intra-articular de joelho" required />
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Região anatômica</label>
              <input value={regiao} onChange={(e) => setRegiao(e.target.value)} placeholder="Ex: Joelho" />
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Lateralidade</label>
              <select value={lateralidade} onChange={(e) => setLateralidade(e.target.value)}>
                <option value="">—</option>
                <option value="direito">Direito</option>
                <option value="esquerdo">Esquerdo</option>
                <option value="bilateral">Bilateral</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11 }}>Produto utilizado</label>
              <input value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Ex: PRP, Ácido hialurônico, Toxina botulínica" />
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Lote</label>
              <input value={lote} onChange={(e) => setLote(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Validade do produto</label>
              <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11 }}>Volume aplicado</label>
              <input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="Ex: 3 ml" />
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Concentração</label>
              <input value={concentracao} onChange={(e) => setConcentracao(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Via de administração</label>
              <select value={via} onChange={(e) => setVia(e.target.value)}>
                <option value="">Selecione</option>
                {VIAS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 8 }}>
              <input type="checkbox" checked={guiadoUsg} onChange={(e) => setGuiadoUsg(e.target.checked)} style={{ width: "auto", marginBottom: 0 }} />
              Guiado por USG
            </label>
            <div>
              <label style={{ fontSize: 11 }}>Data do procedimento</label>
              <input type="date" value={dataProcedimento} onChange={(e) => setDataProcedimento(e.target.value)} />
            </div>
          </div>

          <label style={{ fontSize: 11 }}>Observações</label>
          <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} style={{ width: "100%", padding: 8 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 8, marginBottom: 10 }}>
            <input type="checkbox" checked={criarFollowup} onChange={(e) => setCriarFollowup(e.target.checked)} style={{ width: "auto", marginBottom: 0 }} />
            Criar follow-ups automáticos (D+7, D+30, D+90)
          </label>

          <button type="submit" disabled={salvando || !nome.trim()} style={{ fontSize: 12 }}>
            {salvando ? "Salvando..." : "Salvar procedimento"}
          </button>
        </form>
      )}

      {lista.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhum procedimento registrado ainda.</p>}

      {lista.map((p) => {
        const expandido = expandidoId === p.id;
        return (
          <div key={p.id} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpandidoId(expandido ? null : p.id)}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                  {p.nome_procedimento}
                  {p.regiao_anatomica && ` — ${p.regiao_anatomica}`}
                  {p.lateralidade && ` (${p.lateralidade})`}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--cor-texto-fraco)" }}>
                  {new Date(p.data_procedimento + "T00:00:00").toLocaleDateString("pt-BR")}
                  {p.produto && ` · ${p.produto}`}
                  {p.guiado_por_usg && " · guiado por USG"}
                </p>
              </div>
              <span style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>{expandido ? "▾" : "▸"}</span>
            </div>
            {expandido && (
              <div style={{ marginTop: 10, fontSize: 12 }}>
                {p.produto && <p style={{ margin: "3px 0" }}><b>Produto:</b> {p.produto}</p>}
                {p.lote && <p style={{ margin: "3px 0" }}><b>Lote:</b> {p.lote}</p>}
                {p.validade_produto && (
                  <p style={{ margin: "3px 0" }}>
                    <b>Validade do produto:</b> {new Date(p.validade_produto + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                )}
                {p.volume_aplicado && <p style={{ margin: "3px 0" }}><b>Volume:</b> {p.volume_aplicado}</p>}
                {p.concentracao && <p style={{ margin: "3px 0" }}><b>Concentração:</b> {p.concentracao}</p>}
                {p.via_administracao && <p style={{ margin: "3px 0" }}><b>Via:</b> {p.via_administracao}</p>}
                <p style={{ margin: "3px 0" }}><b>Guiado por USG:</b> {p.guiado_por_usg ? "Sim" : "Não"}</p>
                {p.observacoes && <p style={{ margin: "3px 0", whiteSpace: "pre-wrap" }}><b>Observações:</b> {p.observacoes}</p>}

                {followups.filter((f) => f.procedimento_id === p.id).length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--cor-borda)" }}>
                    <p style={{ fontWeight: 700, margin: "0 0 6px" }}>Follow-ups deste procedimento</p>
                    {followups
                      .filter((f) => f.procedimento_id === p.id)
                      .map((f) => (
                        <div key={f.id} style={{ marginBottom: 6 }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 8px",
                              borderRadius: 8,
                              marginRight: 6,
                              background:
                                f.status === "feito" ? "var(--cor-status-dentro-fundo)" : f.status === "pulado" ? "var(--cor-fundo-card-alt)" : "var(--cor-status-abaixo-fundo)",
                              color:
                                f.status === "feito" ? "var(--cor-status-dentro-texto)" : f.status === "pulado" ? "var(--cor-texto-fraco)" : "var(--cor-status-abaixo-texto)",
                            }}
                          >
                            {f.status === "feito" ? "feito" : f.status === "pulado" ? "pulado" : "pendente"}
                          </span>
                          {f.rotulo} — previsto {new Date(f.data_prevista + "T00:00:00").toLocaleDateString("pt-BR")}
                          {f.concluido_em && ` · concluído ${new Date(f.concluido_em).toLocaleDateString("pt-BR")}`}
                          {f.observacao && (
                            <span style={{ display: "block", color: "var(--cor-texto-fraco)", marginTop: 2 }}>"{f.observacao}"</span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
