"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Alergia = {
  id: string;
  substancia: string;
  tipo: string | null;
  reacao: string | null;
  gravidade: string | null;
};

type Medicacao = {
  id: string;
  medicamento: string;
  dose: string | null;
  frequencia: string | null;
  anticoagulante: boolean;
};

export default function FaixaSegurancaClinica({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [medicacoes, setMedicacoes] = useState<Medicacao[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [aberto, setAberto] = useState(false);

  // formulário de alergia
  const [substancia, setSubstancia] = useState("");
  const [reacao, setReacao] = useState("");
  const [gravidade, setGravidade] = useState("");

  // formulário de medicação
  const [medicamento, setMedicamento] = useState("");
  const [dose, setDose] = useState("");
  const [frequencia, setFrequencia] = useState("");
  const [ehAnticoagulante, setEhAnticoagulante] = useState(false);

  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from("alergias_paciente").select("id, substancia, tipo, reacao, gravidade").eq("paciente_id", pacienteId).eq("ativo", true),
      supabase.from("medicacoes_paciente").select("id, medicamento, dose, frequencia, anticoagulante").eq("paciente_id", pacienteId).eq("ativo", true),
    ]);
    setAlergias(a ?? []);
    setMedicacoes(m ?? []);
    setCarregado(true);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function salvarAlergia(e: React.FormEvent) {
    e.preventDefault();
    if (!substancia.trim()) return;
    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("alergias_paciente").insert({
      paciente_id: pacienteId,
      substancia: substancia.trim(),
      reacao: reacao.trim() || null,
      gravidade: gravidade || null,
      registrado_por: user?.id,
    });
    setSubstancia("");
    setReacao("");
    setGravidade("");
    setSalvando(false);
    carregar();
  }

  async function salvarMedicacao(e: React.FormEvent) {
    e.preventDefault();
    if (!medicamento.trim()) return;
    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("medicacoes_paciente").insert({
      paciente_id: pacienteId,
      medicamento: medicamento.trim(),
      dose: dose.trim() || null,
      frequencia: frequencia.trim() || null,
      anticoagulante: ehAnticoagulante,
      registrado_por: user?.id,
    });
    setMedicamento("");
    setDose("");
    setFrequencia("");
    setEhAnticoagulante(false);
    setSalvando(false);
    carregar();
  }

  async function suspender(tabela: "alergias_paciente" | "medicacoes_paciente", id: string) {
    await supabase.from(tabela).update({ ativo: false }).eq("id", id);
    carregar();
  }

  if (!carregado) return null;

  const temAnticoagulante = medicacoes.some((m) => m.anticoagulante);
  const temAlergiaGrave = alergias.some((a) => a.gravidade === "grave");

  const chip = (texto: string, cor: "alerta" | "atencao" | "neutro") => {
    const cores = {
      alerta: { fundo: "var(--cor-status-acima-fundo)", texto: "var(--cor-status-acima-texto)" },
      atencao: { fundo: "var(--cor-status-abaixo-fundo)", texto: "var(--cor-status-abaixo-texto)" },
      neutro: { fundo: "var(--cor-fundo-card-alt)", texto: "var(--cor-texto-suave)" },
    }[cor];
    return (
      <span
        key={texto}
        style={{
          background: cores.fundo,
          color: cores.texto,
          padding: "3px 10px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {texto}
      </span>
    );
  };

  return (
    <div
      style={{
        border: `1px solid ${temAlergiaGrave || temAnticoagulante ? "var(--cor-status-acima-texto)" : "var(--cor-borda)"}`,
        borderRadius: 12,
        padding: "10px 14px",
        background: "var(--cor-fundo-card)",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)" }}>
          Alergias
        </span>
        {alergias.length === 0
          ? chip("Nenhuma registrada", "neutro")
          : alergias.map((a) => chip(a.substancia + (a.gravidade === "grave" ? " (grave)" : ""), a.gravidade === "grave" ? "alerta" : "atencao"))}

        <span style={{ width: 1, height: 16, background: "var(--cor-borda)" }} />

        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)" }}>
          Medicações
        </span>
        {medicacoes.length === 0
          ? chip("Nenhuma registrada", "neutro")
          : medicacoes.map((m) => chip(m.medicamento + (m.anticoagulante ? " ⚠ anticoagulante" : ""), m.anticoagulante ? "alerta" : "neutro"))}

        <button type="button" onClick={() => setAberto(!aberto)} className="botao-secundario" style={{ marginLeft: "auto", fontSize: 11, padding: "4px 12px" }}>
          {aberto ? "Fechar" : "Gerenciar"}
        </button>
      </div>

      {aberto && (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px" }}>Adicionar alergia</p>
            <form onSubmit={salvarAlergia}>
              <input placeholder="Substância (ex: Dipirona)" value={substancia} onChange={(e) => setSubstancia(e.target.value)} />
              <input placeholder="Reação (ex: urticária)" value={reacao} onChange={(e) => setReacao(e.target.value)} />
              <select value={gravidade} onChange={(e) => setGravidade(e.target.value)}>
                <option value="">Gravidade (opcional)</option>
                <option value="leve">Leve</option>
                <option value="moderada">Moderada</option>
                <option value="grave">Grave</option>
              </select>
              <button type="submit" disabled={salvando || !substancia.trim()} style={{ fontSize: 12 }}>
                Adicionar alergia
              </button>
            </form>
            {alergias.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, marginTop: 10, fontSize: 12 }}>
                {alergias.map((a) => (
                  <li key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                    <span>
                      {a.substancia}
                      {a.reacao && ` — ${a.reacao}`}
                    </span>
                    <button type="button" onClick={() => suspender("alergias_paciente", a.id)} className="botao-secundario" style={{ fontSize: 11, padding: "2px 8px" }}>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px" }}>Adicionar medicação em uso</p>
            <form onSubmit={salvarMedicacao}>
              <input placeholder="Medicamento" value={medicamento} onChange={(e) => setMedicamento(e.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} />
                <input placeholder="Frequência" value={frequencia} onChange={(e) => setFrequencia(e.target.value)} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={ehAnticoagulante}
                  onChange={(e) => setEhAnticoagulante(e.target.checked)}
                  style={{ width: "auto", marginBottom: 0 }}
                />
                É anticoagulante / antiagregante
              </label>
              <button type="submit" disabled={salvando || !medicamento.trim()} style={{ fontSize: 12 }}>
                Adicionar medicação
              </button>
            </form>
            {medicacoes.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, marginTop: 10, fontSize: 12 }}>
                {medicacoes.map((m) => (
                  <li key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                    <span>
                      {m.medicamento}
                      {m.dose && ` ${m.dose}`}
                      {m.frequencia && ` — ${m.frequencia}`}
                    </span>
                    <button type="button" onClick={() => suspender("medicacoes_paciente", m.id)} className="botao-secundario" style={{ fontSize: 11, padding: "2px 8px" }}>
                      Suspender
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
