"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SeletorPaciente from "../pacientes/seletor-paciente";

const HORA_INICIO = 8;
const HORA_FIM = 21;
const ALTURA_HORA = 44; // px por hora
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Agendamento = {
  id: string;
  paciente_id: string | null;
  profissional_id: string;
  data_hora: string;
  duracao_minutos: number;
  tipo_evento_id: string | null;
  titulo_livre: string | null;
  status: string;
  observacao: string | null;
  pacientes: { nome: string } | null;
};

type Paciente = { id: string; nome: string };
type Usuario = { id: string; nome: string; cor_agenda: string };
type TipoEvento = { id: string; nome: string; requer_paciente: boolean };

function inicioDaSemana(data: Date) {
  const d = new Date(data);
  const diaSemana = d.getDay(); // 0 = domingo
  const diff = d.getDate() - diaSemana + 1; // segunda-feira
  return new Date(d.setDate(diff));
}

export default function AgendaCalendario() {
  const supabase = createClient();
  const [semanaBase, setSemanaBase] = useState(() => inicioDaSemana(new Date()));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [usuariosAgenda, setUsuariosAgenda] = useState<Usuario[]>([]);
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [linkFeed, setLinkFeed] = useState<string | null>(null);
  const [meuId, setMeuId] = useState<string | null>(null);

  // formulário de novo agendamento
  const [slotSelecionado, setSlotSelecionado] = useState<{ dia: Date; hora: number } | null>(null);
  const [profissionalId, setProfissionalId] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [tipoEventoId, setTipoEventoId] = useState("");
  const [tituloLivre, setTituloLivre] = useState("");
  const [duracao, setDuracao] = useState(30);
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
      .select(
        "id, paciente_id, profissional_id, data_hora, duracao_minutos, tipo_evento_id, titulo_livre, status, observacao, pacientes ( nome )"
      )
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

    supabase
      .from("usuarios")
      .select("id, nome, cor_agenda")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setUsuariosAgenda(data ?? []));

    supabase
      .from("tipos_evento")
      .select("id, nome, requer_paciente")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setTiposEvento(data ?? []));

    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovoSlot(dia: Date, hora: number) {
    setSlotSelecionado({ dia, hora });
    setProfissionalId(meuId ?? "");
    setPacienteId("");
    setTipoEventoId("");
    setTituloLivre("");
    setDuracao(30);
    setObservacao("");
    setErro(null);
  }

  async function salvarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    if (!slotSelecionado || !profissionalId || !tipoEventoId) return;

    const tipoSelecionado = tiposEvento.find((t) => t.id === tipoEventoId);
    if (tipoSelecionado?.requer_paciente && !pacienteId) {
      setErro("Esse tipo de evento exige selecionar um paciente.");
      return;
    }

    setErro(null);
    setSalvando(true);

    const dataHora = new Date(slotSelecionado.dia);
    dataHora.setHours(slotSelecionado.hora, 0, 0, 0);

    const { error } = await supabase.from("agendamentos").insert({
      paciente_id: tipoSelecionado?.requer_paciente ? pacienteId : null,
      profissional_id: profissionalId,
      data_hora: dataHora.toISOString(),
      duracao_minutos: duracao,
      tipo_evento_id: tipoEventoId,
      titulo_livre: tipoSelecionado?.requer_paciente ? null : tituloLivre || null,
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
        <button type="button" onClick={gerarLinkFeed} style={{ background: "var(--cor-texto-suave)" }}>
          Gerar link p/ Google Agenda / iPhone
        </button>
      </div>

      {linkFeed && (
        <div style={{ background: "var(--cor-fundo-card)", border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: "0.85rem" }}>
          <p style={{ margin: "0 0 4px" }}>
            <b>Link de assinatura</b> (cole no Google Agenda &gt; Outras agendas &gt; Por URL, ou no app Calendário do
            iPhone &gt; Adicionar calendário &gt; Assinar):
          </p>
          <code style={{ wordBreak: "break-all" }}>{linkFeed}</code>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12, fontSize: "0.85rem" }}>
        {usuariosAgenda.map((u) => (
          <span key={u.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: u.cor_agenda, display: "inline-block" }} />
            {u.nome}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "50px repeat(6, 1fr)", border: "1px solid var(--cor-borda)" }}>
        <div></div>
        {dias.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              padding: 8,
              fontWeight: "bold",
              fontSize: "0.85rem",
              borderLeft: "1px solid var(--cor-borda)",
              borderBottom: "1px solid var(--cor-borda)",
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
                color: "var(--cor-texto-muito-fraco)",
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
              borderLeft: "1px solid var(--cor-borda)",
              backgroundImage: `repeating-linear-gradient(to bottom, var(--cor-fundo) 0 ${ALTURA_HORA - 1}px, #182527 ${ALTURA_HORA - 1}px ${ALTURA_HORA}px)`,
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
                  cursor: "pointer",
                }}
              />
            ))}

            {agendamentosDoDia(dia).map((a) => {
              const d = new Date(a.data_hora);
              const topo = (d.getHours() + d.getMinutes() / 60 - HORA_INICIO) * ALTURA_HORA;
              const altura = (a.duracao_minutos / 60) * ALTURA_HORA;
              const profissional = usuariosAgenda.find((u) => u.id === a.profissional_id);
              const tipoEvento = tiposEvento.find((t) => t.id === a.tipo_evento_id);
              const rotulo = a.pacientes?.nome ?? a.titulo_livre ?? tipoEvento?.nome ?? "Evento";
              const cancelado = a.status === "cancelado";
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
                    background: profissional?.cor_agenda ?? "var(--cor-marca)",
                    color: "#06211e",
                    borderRadius: 6,
                    padding: "3px 7px",
                    fontSize: 11,
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    cursor: "pointer",
                    opacity: cancelado ? 0.4 : 1,
                    textDecoration: cancelado ? "line-through" : "none",
                  }}
                >
                  {d.getHours().toString().padStart(2, "0")}:{d.getMinutes().toString().padStart(2, "0")} — {rotulo}
                  {a.status === "faltou" && " (faltou)"}
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
            style={{ background: "var(--cor-fundo-card)", borderRadius: 8, padding: 24, maxWidth: 400, width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>
              Novo agendamento — {slotSelecionado.dia.toLocaleDateString("pt-BR")} às {slotSelecionado.hora}h
            </h2>
            <form onSubmit={salvarAgendamento}>
              {erro && <p className="erro">{erro}</p>}

              <label>Profissional</label>
              <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} required style={{ padding: 8, width: "100%", marginBottom: 12 }}>
                <option value="">Selecione</option>
                {usuariosAgenda.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>

              <label>Tipo de evento</label>
              <select
                value={tipoEventoId}
                onChange={(e) => setTipoEventoId(e.target.value)}
                required
                style={{ padding: 8, width: "100%", marginBottom: 12 }}
              >
                <option value="">Selecione</option>
                {tiposEvento.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>

              {tiposEvento.find((t) => t.id === tipoEventoId)?.requer_paciente !== false && (
                <div style={{ marginBottom: 12 }}>
                  <label>Paciente</label>
                  <SeletorPaciente pacientes={pacientes} value={pacienteId} onChange={setPacienteId} />
                </div>
              )}

              {tiposEvento.find((t) => t.id === tipoEventoId)?.requer_paciente === false && (
                <>
                  <label>Título/descrição</label>
                  <input value={tituloLivre} onChange={(e) => setTituloLivre(e.target.value)} placeholder="Ex: Feriado - Natal" />
                </>
              )}

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
              <button type="button" onClick={() => setSlotSelecionado(null)} style={{ background: "transparent", color: "var(--cor-texto-suave)" }}>
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
          <div style={{ background: "var(--cor-fundo-card)", borderRadius: 8, padding: 24, maxWidth: 380, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>
              {agendamentoDetalhe.paciente_id ? (
                <Link href={`/pacientes/${agendamentoDetalhe.paciente_id}`} style={{ color: "var(--cor-marca)" }}>
                  {agendamentoDetalhe.pacientes?.nome ?? "Paciente"} →
                </Link>
              ) : (
                agendamentoDetalhe.titulo_livre ?? "Evento"
              )}
            </h2>
            <p style={{ fontSize: "0.9rem" }}>
              {usuariosAgenda.find((u) => u.id === agendamentoDetalhe.profissional_id)?.nome} ·{" "}
              {new Date(agendamentoDetalhe.data_hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} ·{" "}
              {tiposEvento.find((t) => t.id === agendamentoDetalhe.tipo_evento_id)?.nome} ·{" "}
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
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe.id, "cancelado")} style={{ background: "var(--cor-erro)" }}>
                Cancelar
              </button>
              <button type="button" onClick={() => excluirAgendamento(agendamentoDetalhe.id)} style={{ background: "transparent", color: "var(--cor-texto-suave)" }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
