"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const HORA_INICIO = 8;
const HORA_FIM = 21;
const ALTURA_HORA = 56; // px por hora
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Agendamento = {
  id: string;
  paciente_id: string;
  data_hora: string;
  duracao_minutos: number;
  tipo_atendimento: string;
  status: string;
  observacao: string | null;
  pacientes: { nome: string };
};

type Paciente = { id: string; nome: string };

function inicioDaSemana(data: Date) {
  const d = new Date(data);
  const diaSemana = d.getDay(); // 0 = domingo
  const diff = d.getDate() - diaSemana + 1; // segunda-feira
  return new Date(d.setDate(diff));
}

const CORES_STATUS: Record<string, string> = {
  agendado: "#d9c48f",
  confirmado: "#7a5a2f",
  realizado: "#4a7a4a",
  cancelado: "#999",
  faltou: "#b3261e",
};

export default function AgendaCalendario() {
  const supabase = createClient();
  const [semanaBase, setSemanaBase] = useState(() => inicioDaSemana(new Date()));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [linkFeed, setLinkFeed] = useState<string | null>(null);

  // formulário de novo agendamento
  const [slotSelecionado, setSlotSelecionado] = useState<{ dia: Date; hora: number } | null>(null);
  const [pacienteId, setPacienteId] = useState("");
  const [duracao, setDuracao] = useState(30);
  const [tipoAtendimento, setTipoAtendimento] = useState("consulta");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // detalhe de um agendamento existente
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const dias = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(semanaBase);
    d.setDate(d.getDate() + i);
    return d;
  }); // Seg a Sáb

  async function carregar() {
    const inicio = new Date(semanaBase);
    const fim = new Date(semanaBase);
    fim.setDate(fim.getDate() + 6);

    const { data } = await supabase
      .from("agendamentos")
      .select("id, paciente_id, data_hora, duracao_minutos, tipo_atendimento, status, observacao, pacientes ( nome )")
      .gte("data_hora", inicio.toISOString())
      .lt("data_hora", fim.toISOString())
      .order("data_hora");

    setAgendamentos((data as any) ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanaBase]);

  useEffect(() => {
    supabase
      .from("pacientes")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setPacientes(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovoSlot(dia: Date, hora: number) {
    setSlotSelecionado({ dia, hora });
    setPacienteId("");
    setDuracao(30);
    setTipoAtendimento("consulta");
    setObservacao("");
    setErro(null);
  }

  async function salvarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    if (!slotSelecionado || !pacienteId) return;
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

    const dataHora = new Date(slotSelecionado.dia);
    dataHora.setHours(slotSelecionado.hora, 0, 0, 0);

    const { error } = await supabase.from("agendamentos").insert({
      paciente_id: pacienteId,
      profissional_id: user.id,
      data_hora: dataHora.toISOString(),
      duracao_minutos: duracao,
      tipo_atendimento: tipoAtendimento,
      observacao: observacao || null,
    });

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setSlotSelecionado(null);
    carregar();
  }

  async function atualizarStatus(id: string, status: string) {
    await supabase.from("agendamentos").update({ status }).eq("id", id);
    setDetalheId(null);
    carregar();
  }

  async function excluirAgendamento(id: string) {
    await supabase.from("agendamentos").delete().eq("id", id);
    setDetalheId(null);
    carregar();
  }

  async function gerarLinkFeed() {
    const { data, error } = await supabase.rpc("regenerar_feed_token");
    if (error || !data) return;
    const url = `${window.location.origin}/api/agenda/feed?token=${data}`;
    setLinkFeed(url);
  }

  function agendamentosDoDia(dia: Date) {
    return agendamentos.filter((a) => {
      const d = new Date(a.data_hora);
      return d.toDateString() === dia.toDateString();
    });
  }

  const horas = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const agendamentoDetalhe = agendamentos.find((a) => a.id === detalheId);

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <h1>Agenda</h1>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <button
            type="button"
            onClick={() => {
              const nova = new Date(semanaBase);
              nova.setDate(nova.getDate() - 7);
              setSemanaBase(nova);
            }}
          >
            ← Semana anterior
          </button>{" "}
          <button
            type="button"
            onClick={() => {
              const nova = new Date(semanaBase);
              nova.setDate(nova.getDate() + 7);
              setSemanaBase(nova);
            }}
          >
            Próxima semana →
          </button>
        </div>
        <button type="button" onClick={gerarLinkFeed} style={{ background: "#555" }}>
          Gerar link p/ Google Agenda / iPhone
        </button>
      </div>

      {linkFeed && (
        <div style={{ background: "#fbfaf7", border: "1px solid #e5e0d8", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: "0.85rem" }}>
          <p style={{ margin: "0 0 4px" }}>
            <b>Link de assinatura</b> (cole no Google Agenda &gt; Outras agendas &gt; Por URL, ou no app Calendário do
            iPhone &gt; Adicionar calendário &gt; Assinar):
          </p>
          <code style={{ wordBreak: "break-all" }}>{linkFeed}</code>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "50px repeat(6, 1fr)", border: "1px solid #e5e0d8" }}>
        <div></div>
        {dias.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              padding: 8,
              fontWeight: "bold",
              fontSize: "0.85rem",
              borderLeft: "1px solid #e5e0d8",
              borderBottom: "1px solid #e5e0d8",
            }}
          >
            {DIAS_SEMANA[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
          </div>
        ))}

        <div style={{ position: "relative", height: horas.length * ALTURA_HORA }}>
          {horas.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                top: (h - HORA_INICIO) * ALTURA_HORA,
                right: 4,
                fontSize: "0.7rem",
                color: "#999",
              }}
            >
              {h}h
            </div>
          ))}
        </div>

        {dias.map((dia, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              height: horas.length * ALTURA_HORA,
              borderLeft: "1px solid #e5e0d8",
            }}
          >
            {horas.map((h) => (
              <div
                key={h}
                onClick={() => abrirNovoSlot(dia, h)}
                style={{
                  position: "absolute",
                  top: (h - HORA_INICIO) * ALTURA_HORA,
                  width: "100%",
                  height: ALTURA_HORA,
                  borderBottom: "1px solid #f0ede6",
                  cursor: "pointer",
                }}
              />
            ))}

            {agendamentosDoDia(dia).map((a) => {
              const d = new Date(a.data_hora);
              const topo = (d.getHours() + d.getMinutes() / 60 - HORA_INICIO) * ALTURA_HORA;
              const altura = (a.duracao_minutos / 60) * ALTURA_HORA;
              return (
                <div
                  key={a.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetalheId(a.id);
                  }}
                  style={{
                    position: "absolute",
                    top: topo,
                    height: Math.max(altura, 20),
                    left: 2,
                    right: 2,
                    background: CORES_STATUS[a.status] ?? "#d9c48f",
                    color: "white",
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: "0.75rem",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  {d.getHours().toString().padStart(2, "0")}:{d.getMinutes().toString().padStart(2, "0")} —{" "}
                  {a.pacientes?.nome}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Formulário de novo agendamento */}
      {slotSelecionado && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSlotSelecionado(null)}
        >
          <div
            style={{ background: "white", borderRadius: 8, padding: 24, maxWidth: 400, width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>
              Novo agendamento — {slotSelecionado.dia.toLocaleDateString("pt-BR")} às {slotSelecionado.hora}h
            </h2>
            <form onSubmit={salvarAgendamento}>
              {erro && <p className="erro">{erro}</p>}
              <label>Paciente</label>
              <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required style={{ padding: 8, width: "100%", marginBottom: 12 }}>
                <option value="">Selecione</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>

              <label>Tipo de atendimento</label>
              <select value={tipoAtendimento} onChange={(e) => setTipoAtendimento(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 12 }}>
                <option value="consulta">Consulta</option>
                <option value="procedimento">Procedimento</option>
                <option value="revisao">Revisão</option>
                <option value="outro">Outro</option>
              </select>

              <label>Duração (minutos)</label>
              <select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} style={{ padding: 8, width: "100%", marginBottom: 12 }}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>

              <label>Observação</label>
              <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />

              <button type="submit" disabled={salvando} style={{ marginTop: 12, marginRight: 8 }}>
                {salvando ? "Salvando..." : "Agendar"}
              </button>
              <button type="button" onClick={() => setSlotSelecionado(null)} style={{ background: "transparent", color: "#666" }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detalhe de agendamento existente */}
      {agendamentoDetalhe && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setDetalheId(null)}
        >
          <div style={{ background: "white", borderRadius: 8, padding: 24, maxWidth: 380, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>{agendamentoDetalhe.pacientes?.nome}</h2>
            <p style={{ fontSize: "0.9rem" }}>
              {new Date(agendamentoDetalhe.data_hora).toLocaleString("pt-BR")} · {agendamentoDetalhe.tipo_atendimento} ·{" "}
              {agendamentoDetalhe.duracao_minutos} min
            </p>
            {agendamentoDetalhe.observacao && <p style={{ fontSize: "0.9rem" }}>{agendamentoDetalhe.observacao}</p>}
            <p style={{ fontSize: "0.9rem" }}>
              Status atual: <b>{agendamentoDetalhe.status}</b>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe.id, "confirmado")}>
                Confirmar
              </button>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe.id, "realizado")}>
                Marcar realizado
              </button>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe.id, "faltou")}>
                Faltou
              </button>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe.id, "cancelado")} style={{ background: "#b3261e" }}>
                Cancelar
              </button>
              <button type="button" onClick={() => excluirAgendamento(agendamentoDetalhe.id)} style={{ background: "transparent", color: "#666" }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
