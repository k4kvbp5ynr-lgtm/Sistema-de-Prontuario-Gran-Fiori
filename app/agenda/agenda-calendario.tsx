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
  data_hora_fim: string | null;
  duracao_minutos: number;
  tipo_evento_id: string | null;
  titulo_livre: string | null;
  status: string;
  observacao: string | null;
  serie_id: string | null;
  dia_inteiro: boolean;
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
  const [profissionaisVisiveis, setProfissionaisVisiveis] = useState<Set<string> | null>(null);

  // formulário de novo agendamento
  const [slotSelecionado, setSlotSelecionado] = useState<{ dia: Date; hora: number } | null>(null);
  const [profissionalId, setProfissionalId] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [tipoEventoId, setTipoEventoId] = useState("");
  const [tituloLivre, setTituloLivre] = useState("");
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("08:30");
  const [dataFim, setDataFim] = useState("");
  const [repetirSemanalmente, setRepetirSemanalmente] = useState(false);
  const [diasSemanaRepeticao, setDiasSemanaRepeticao] = useState<Set<number>>(new Set());
  const [repetirAte, setRepetirAte] = useState("");
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
        "id, paciente_id, profissional_id, data_hora, data_hora_fim, duracao_minutos, tipo_evento_id, titulo_livre, status, observacao, serie_id, dia_inteiro, pacientes ( nome )"
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
      .then(({ data }) => {
        setUsuariosAgenda(data ?? []);
        setProfissionaisVisiveis(new Set((data ?? []).map((u) => u.id)));
      });

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
    setDiaInteiro(false);
    setHoraInicio(`${String(hora).padStart(2, "0")}:00`);
    setHoraFim(`${String(Math.min(hora + 1, HORA_FIM)).padStart(2, "0")}:00`);
    setDataFim(dia.toISOString().slice(0, 10));
    setRepetirSemanalmente(false);
    setDiasSemanaRepeticao(new Set([dia.getDay()]));
    setRepetirAte("");
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
    if (repetirSemanalmente && (!repetirAte || diasSemanaRepeticao.size === 0)) {
      setErro('Selecione ao menos um dia da semana e até quando repetir, ou desmarque "Repetir".');
      return;
    }

    setErro(null);
    setSalvando(true);

    const [hIni, mIni] = diaInteiro ? [HORA_INICIO, 0] : horaInicio.split(":").map(Number);
    const [hFimDia, mFimDia] = diaInteiro ? [HORA_FIM, 0] : horaFim.split(":").map(Number);

    const inicioBase = new Date(slotSelecionado.dia);
    inicioBase.setHours(hIni, mIni, 0, 0);

    const diaFimEscolhido = dataFim ? new Date(dataFim + "T00:00:00") : new Date(slotSelecionado.dia);
    const ehVariosDias = diaFimEscolhido.toDateString() !== inicioBase.toDateString();

    function calcularFim(inicio: Date): { fim: Date; duracaoMin: number } {
      const fim = new Date(ehVariosDias ? diaFimEscolhido : inicio);
      fim.setHours(hFimDia, mFimDia, 0, 0);
      const duracaoMin = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 60000));
      return { fim, duracaoMin };
    }

    // Gera as datas de início de cada ocorrência: sem repetição = só a data escolhida;
    // com repetição = todo dia entre o início e "repetir até" cujo dia da semana esteja marcado.
    const ocorrenciasInicio: Date[] = [];
    if (repetirSemanalmente && repetirAte) {
      const limite = new Date(repetirAte + "T23:59:59");
      const cursor = new Date(inicioBase);
      cursor.setHours(0, 0, 0, 0);
      while (cursor <= limite) {
        if (diasSemanaRepeticao.has(cursor.getDay())) {
          const dataOcorrencia = new Date(cursor);
          dataOcorrencia.setHours(hIni, mIni, 0, 0);
          if (dataOcorrencia >= inicioBase) ocorrenciasInicio.push(dataOcorrencia);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      ocorrenciasInicio.push(inicioBase);
    }

    const serieId = repetirSemanalmente ? crypto.randomUUID() : null;

    const linhas = ocorrenciasInicio.map((inicio) => {
      const { fim, duracaoMin } = calcularFim(inicio);
      return {
        paciente_id: tipoSelecionado?.requer_paciente ? pacienteId : null,
        profissional_id: profissionalId,
        data_hora: inicio.toISOString(),
        data_hora_fim: fim.toISOString(),
        duracao_minutos: duracaoMin,
        tipo_evento_id: tipoEventoId,
        titulo_livre: tipoSelecionado?.requer_paciente ? null : tituloLivre || null,
        observacao: observacao || null,
        serie_id: serieId,
        dia_inteiro: diaInteiro,
      };
    });

    const { error } = await supabase.from("agendamentos").insert(linhas);

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setSlotSelecionado(null);
    carregar();
  }

  async function atualizarStatus(agendamento: Agendamento, status: string, escopo: "esta" | "futuras" = "esta") {
    if (escopo === "futuras" && agendamento.serie_id) {
      await supabase
        .from("agendamentos")
        .update({ status })
        .eq("serie_id", agendamento.serie_id)
        .gte("data_hora", agendamento.data_hora);
    } else {
      await supabase.from("agendamentos").update({ status }).eq("id", agendamento.id);
    }
    setDetalheId(null);
    carregar();
  }

  async function excluirAgendamento(agendamento: Agendamento, escopo: "esta" | "futuras" = "esta") {
    if (escopo === "futuras" && agendamento.serie_id) {
      await supabase.from("agendamentos").delete().eq("serie_id", agendamento.serie_id).gte("data_hora", agendamento.data_hora);
    } else {
      await supabase.from("agendamentos").delete().eq("id", agendamento.id);
    }
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
      if (profissionaisVisiveis && !profissionaisVisiveis.has(a.profissional_id)) return false;
      if (a.dia_inteiro) return false; // esses têm renderização própria (coluna inteira)
      const d = new Date(a.data_hora);
      const ehMultiDia = a.data_hora_fim && new Date(a.data_hora_fim).toDateString() !== d.toDateString();
      if (ehMultiDia) return false; // esses vão na faixa de vários dias, não na grade de horas
      return d.toDateString() === dia.toDateString();
    });
  }

  function diaInteiroDoDia(dia: Date) {
    return agendamentos.filter((a) => {
      if (profissionaisVisiveis && !profissionaisVisiveis.has(a.profissional_id)) return false;
      if (!a.dia_inteiro) return false;
      const inicio = new Date(a.data_hora.split("T")[0] + "T00:00:00");
      const fim = a.data_hora_fim ? new Date(a.data_hora_fim.split("T")[0] + "T00:00:00") : inicio;
      const diaAlvo = new Date(dia.toDateString());
      return diaAlvo >= inicio && diaAlvo <= fim;
    });
  }

  const eventosMultiDia = agendamentos.filter((a) => {
    if (profissionaisVisiveis && !profissionaisVisiveis.has(a.profissional_id)) return false;
    if (a.dia_inteiro) return false; // agora renderizado dentro da própria coluna do dia
    return a.data_hora_fim && new Date(a.data_hora_fim).toDateString() !== new Date(a.data_hora).toDateString();
  });

  function alternarProfissionalVisivel(id: string) {
    setProfissionaisVisiveis((atual) => {
      const novo = new Set(atual ?? []);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, fontSize: "0.85rem" }}>
        {usuariosAgenda.map((u) => {
          const visivel = !profissionaisVisiveis || profissionaisVisiveis.has(u.id);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => alternarProfissionalVisivel(u.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 16,
                background: visivel ? "var(--cor-fundo-card-alt)" : "transparent",
                border: "1px solid var(--cor-borda-input)",
                opacity: visivel ? 1 : 0.45,
                fontSize: 12,
                color: "var(--cor-texto-suave)",
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: u.cor_agenda, display: "inline-block" }} />
              {u.nome}
            </button>
          );
        })}
      </div>

      {eventosMultiDia.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "50px repeat(6, 1fr)",
            border: "1px solid var(--cor-borda)",
            borderBottom: "none",
          }}
        >
          <div style={{ fontSize: 10, color: "var(--cor-texto-muito-fraco)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Vários dias
          </div>
          <div style={{ gridColumn: "2 / span 6", position: "relative", minHeight: 28, padding: "3px 0" }}>
            {eventosMultiDia.map((a, i) => {
              const inicio = new Date(a.data_hora);
              const fim = new Date(a.data_hora_fim!);
              // posição em número de dias desde a segunda-feira da semana visível (0 a 5)
              const colInicio = Math.max(0, Math.round((new Date(inicio.toDateString()).getTime() - new Date(dias[0].toDateString()).getTime()) / 86400000));
              const colFim = Math.min(5, Math.round((new Date(fim.toDateString()).getTime() - new Date(dias[0].toDateString()).getTime()) / 86400000));
              if (colFim < 0 || colInicio > 5) return null; // fora da semana visível
              const profissional = usuariosAgenda.find((u) => u.id === a.profissional_id);
              const tipoEvento = tiposEvento.find((t) => t.id === a.tipo_evento_id);
              const rotulo = a.pacientes?.nome ?? a.titulo_livre ?? tipoEvento?.nome ?? "Evento";
              return (
                <div
                  key={a.id}
                  onClick={() => setDetalheId(a.id)}
                  style={{
                    position: "absolute",
                    top: i * 24,
                    left: `${(colInicio / 6) * 100}%`,
                    width: `${((colFim - colInicio + 1) / 6) * 100}%`,
                    height: 20,
                    background: profissional?.cor_agenda ?? "var(--cor-marca)",
                    color: "#06211e",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    cursor: "pointer",
                  }}
                >
                  {rotulo}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

        {dias.map((dia, i) => {
          const diaInteiroEventos = diaInteiroDoDia(dia);
          const corDiaInteiro = diaInteiroEventos[0] ? usuariosAgenda.find((u) => u.id === diaInteiroEventos[0].profissional_id)?.cor_agenda : null;
          return (
          <div
            key={i}
            onClick={() => diaInteiroEventos[0] && setDetalheId(diaInteiroEventos[0].id)}
            style={{
              position: "relative",
              height: horas.length * ALTURA_HORA,
              borderLeft: "1px solid var(--cor-borda)",
              cursor: diaInteiroEventos.length > 0 ? "pointer" : undefined,
              background: diaInteiroEventos.length > 0 ? corDiaInteiro ?? "var(--cor-marca)" : undefined,
              backgroundImage:
                diaInteiroEventos.length > 0
                  ? undefined
                  : `repeating-linear-gradient(to bottom, var(--cor-fundo) 0 ${ALTURA_HORA - 1}px, #182527 ${ALTURA_HORA - 1}px ${ALTURA_HORA}px)`,
              opacity: diaInteiroEventos.length > 0 ? 0.85 : 1,
            }}
          >
            {diaInteiroEventos.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 4,
                  right: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#06211e",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {diaInteiroEventos.map((a) => {
                  const tipoEvento = tiposEvento.find((t) => t.id === a.tipo_evento_id);
                  return a.pacientes?.nome ?? a.titulo_livre ?? tipoEvento?.nome ?? "Dia inteiro";
                }).join(" · ")}
              </div>
            )}

            {diaInteiroEventos.length === 0 &&
              horas.map((h) => (
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
          );
        })}
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

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} style={{ width: "auto", marginBottom: 0 }} />
                Dia inteiro
              </label>

              {!diaInteiro && (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11 }}>Hora de início</label>
                    <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11 }}>Hora de fim</label>
                    <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                  </div>
                </div>
              )}

              <label>Data de fim (só se o evento durar vários dias, ex: férias)</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={repetirSemanalmente}
                  onChange={(e) => setRepetirSemanalmente(e.target.checked)}
                  style={{ width: "auto", marginBottom: 0 }}
                />
                Repetir
              </label>
              {repetirSemanalmente && (
                <>
                  <label style={{ fontSize: 11 }}>Em quais dias da semana</label>
                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    {DIAS_SEMANA.map((label, indice) => {
                      const ativo = diasSemanaRepeticao.has(indice);
                      return (
                        <button
                          key={indice}
                          type="button"
                          onClick={() =>
                            setDiasSemanaRepeticao((atual) => {
                              const novo = new Set(atual);
                              if (novo.has(indice)) novo.delete(indice);
                              else novo.add(indice);
                              return novo;
                            })
                          }
                          style={{
                            width: 36,
                            height: 32,
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            background: ativo ? "var(--cor-marca-fundo)" : "transparent",
                            border: ativo ? "1px solid var(--cor-marca)" : "1px solid var(--cor-borda-input)",
                            color: ativo ? "var(--cor-marca-clara)" : "var(--cor-texto-suave)",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <label style={{ fontSize: 11 }}>Repetir até (data)</label>
                  <input type="date" value={repetirAte} onChange={(e) => setRepetirAte(e.target.value)} />
                </>
              )}

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
              {agendamentoDetalhe.data_hora_fim &&
              new Date(agendamentoDetalhe.data_hora_fim).toDateString() !== new Date(agendamentoDetalhe.data_hora).toDateString()
                ? `até ${new Date(agendamentoDetalhe.data_hora_fim).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                : `${agendamentoDetalhe.duracao_minutos} min`}
            </p>
            {agendamentoDetalhe.observacao && <p style={{ fontSize: "0.9rem" }}>{agendamentoDetalhe.observacao}</p>}
            <p style={{ fontSize: "0.9rem" }}>
              Status atual: <b>{agendamentoDetalhe.status}</b>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe, "confirmado")}>
                Confirmar
              </button>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe, "realizado")}>
                Marcar realizado
              </button>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe, "faltou")}>
                Faltou
              </button>
            </div>

            {agendamentoDetalhe.serie_id && (
              <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", margin: "10px 0 4px" }}>
                Este evento faz parte de uma série recorrente. Cancelar/excluir "esta e as futuras" não afeta ocorrências passadas.
              </p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe, "cancelado", "esta")} style={{ background: "var(--cor-erro)" }}>
                Cancelar só esta
              </button>
              {agendamentoDetalhe.serie_id && (
                <button type="button" onClick={() => atualizarStatus(agendamentoDetalhe, "cancelado", "futuras")} style={{ background: "var(--cor-erro)" }}>
                  Cancelar esta e as futuras
                </button>
              )}
              <button type="button" onClick={() => excluirAgendamento(agendamentoDetalhe, "esta")} style={{ background: "transparent", color: "var(--cor-texto-suave)" }}>
                Excluir só esta
              </button>
              {agendamentoDetalhe.serie_id && (
                <button type="button" onClick={() => excluirAgendamento(agendamentoDetalhe, "futuras")} style={{ background: "transparent", color: "var(--cor-texto-suave)" }}>
                  Excluir esta e as futuras
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
