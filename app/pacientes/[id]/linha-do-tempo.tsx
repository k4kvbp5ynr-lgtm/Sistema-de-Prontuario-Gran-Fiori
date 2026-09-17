"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EventoTimeline = {
  data: string;
  tipo: string;
  titulo: string;
  subtitulo?: string;
  href?: string;
  cor: string;
};

const CORES: Record<string, string> = {
  consulta: "#3d9a91",
  exame: "#7ba3b5",
  procedimento: "#c9a15f",
  escala: "#79c78f",
  avaliacao: "#a3b5e0",
  receita: "#e8bf62",
  relatorio: "#f0908a",
  recibo: "#b3aa98",
};

const ROTULOS: Record<string, string> = {
  consulta: "Consulta",
  exame: "Exames",
  procedimento: "Procedimento",
  escala: "Escala de desfecho",
  avaliacao: "Avaliação física",
  receita: "Receita",
  relatorio: "Relatório",
  recibo: "Recibo",
};

const TODOS_TIPOS = Object.keys(ROTULOS);

export default function LinhaDoTempo({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [eventos, setEventos] = useState<EventoTimeline[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [filtrosAtivos, setFiltrosAtivos] = useState<Set<string>>(new Set(TODOS_TIPOS));

  async function carregar() {
    const lista: EventoTimeline[] = [];

    const { data: encontros } = await supabase
      .from("encontros")
      .select("id, data_hora, evolucoes(motivo_consulta)")
      .eq("paciente_id", pacienteId);
    for (const e of encontros ?? []) {
      const motivo = (e as any).evolucoes?.[0]?.motivo_consulta;
      lista.push({ data: e.data_hora, tipo: "consulta", titulo: "Consulta registrada", subtitulo: motivo ?? undefined, cor: CORES.consulta });
    }

    const { data: exames } = await supabase.from("resultados_exames_paciente").select("data_exame").eq("paciente_id", pacienteId);
    const porData = new Map<string, number>();
    for (const ex of exames ?? []) porData.set(ex.data_exame, (porData.get(ex.data_exame) ?? 0) + 1);
    for (const [data, qtd] of porData.entries()) {
      lista.push({ data, tipo: "exame", titulo: "Exames laboratoriais lançados", subtitulo: `${qtd} marcador(es)`, cor: CORES.exame });
    }

    const { data: procedimentos } = await supabase
      .from("procedimentos_realizados")
      .select("id, data_procedimento, nome_procedimento")
      .eq("paciente_id", pacienteId);
    for (const p of procedimentos ?? []) {
      lista.push({ data: p.data_procedimento, tipo: "procedimento", titulo: p.nome_procedimento, cor: CORES.procedimento });
    }

    const { data: escalas } = await supabase
      .from("respostas_escala")
      .select("id, data_aplicacao, pontuacao, escalas_desfecho(sigla)")
      .eq("paciente_id", pacienteId);
    for (const e of escalas ?? []) {
      const sigla = (e as any).escalas_desfecho?.sigla ?? "Escala";
      lista.push({ data: e.data_aplicacao, tipo: "escala", titulo: `${sigla} aplicada`, subtitulo: `Pontuação: ${e.pontuacao}`, cor: CORES.escala });
    }

    const { data: avaliacoes } = await supabase.from("avaliacoes_fisicas").select("id, data_avaliacao").eq("paciente_id", pacienteId);
    for (const a of avaliacoes ?? []) {
      lista.push({ data: a.data_avaliacao, tipo: "avaliacao", titulo: "Avaliação física registrada", cor: CORES.avaliacao });
    }

    const { data: receitas } = await supabase.from("prescricoes").select("id, criado_em, subtipo_receita").eq("paciente_id", pacienteId);
    for (const r of receitas ?? []) {
      lista.push({
        data: r.criado_em,
        tipo: "receita",
        titulo: "Receita emitida",
        subtitulo: r.subtipo_receita ?? undefined,
        href: `/pacientes/${pacienteId}/receituario/${r.id}`,
        cor: CORES.receita,
      });
    }

    const { data: relatorios } = await supabase.from("relatorios_medicos").select("id, criado_em").eq("paciente_id", pacienteId);
    for (const r of relatorios ?? []) {
      lista.push({ data: r.criado_em, tipo: "relatorio", titulo: "Relatório médico emitido", href: `/pacientes/${pacienteId}/relatorio/${r.id}`, cor: CORES.relatorio });
    }

    const { data: recibos } = await supabase.from("recibos").select("id, criado_em").eq("paciente_id", pacienteId);
    for (const r of recibos ?? []) {
      lista.push({ data: r.criado_em, tipo: "recibo", titulo: "Recibo emitido", href: `/pacientes/${pacienteId}/recibo/${r.id}`, cor: CORES.recibo });
    }

    lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setEventos(lista);
    setCarregado(true);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function alternarFiltro(tipo: string) {
    setFiltrosAtivos((atual) => {
      const novo = new Set(atual);
      if (novo.has(tipo)) novo.delete(tipo);
      else novo.add(tipo);
      return novo;
    });
  }

  if (!carregado) return <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Carregando...</p>;

  const eventosFiltrados = eventos.filter((e) => filtrosAtivos.has(e.tipo));

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Linha do tempo</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", marginBottom: 14 }}>
        Tudo que já aconteceu com este paciente, em ordem cronológica — consultas, exames, procedimentos, escalas, avaliações e documentos.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {TODOS_TIPOS.map((tipo) => {
          const ativo = filtrosAtivos.has(tipo);
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => alternarFiltro(tipo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 16,
                background: ativo ? "var(--cor-fundo-card-alt)" : "transparent",
                border: "1px solid var(--cor-borda-input)",
                opacity: ativo ? 1 : 0.4,
                fontSize: 12,
                color: "var(--cor-texto-suave)",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: CORES[tipo] }} />
              {ROTULOS[tipo]}
            </button>
          );
        })}
      </div>

      {eventosFiltrados.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nada encontrado com esses filtros.</p>}

      <div style={{ position: "relative", paddingLeft: 20 }}>
        <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 1, background: "var(--cor-borda)" }} />
        {eventosFiltrados.map((e, i) => {
          const conteudo = (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{e.titulo}</p>
              {e.subtitulo && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--cor-texto-fraco)" }}>{e.subtitulo}</p>}
            </>
          );
          return (
            <div key={i} style={{ position: "relative", marginBottom: 18 }}>
              <span
                style={{
                  position: "absolute",
                  left: -20,
                  top: 4,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: e.cor,
                  border: "2px solid var(--cor-fundo)",
                }}
              />
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--cor-texto-muito-fraco)", fontFamily: "var(--fonte-mono)" }}>
                {new Date(e.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {ROTULOS[e.tipo]}
              </p>
              {e.href ? (
                <Link href={e.href} style={{ textDecoration: "none", color: "inherit" }}>
                  {conteudo}
                </Link>
              ) : (
                conteudo
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
