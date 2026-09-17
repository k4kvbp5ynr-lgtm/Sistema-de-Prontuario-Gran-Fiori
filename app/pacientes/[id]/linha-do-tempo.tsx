"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSubmenuPilulas } from "./submenu-pilulas";
import ModalDocumento from "./modal-documento";

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

const ABA_POR_TIPO: Record<string, string> = {
  consulta: "historico",
  exame: "exames-lab",
  procedimento: "procedimentos-realizados",
  escala: "escalas",
  avaliacao: "avaliacao-fisica",
};

const TODOS_TIPOS = Object.keys(ROTULOS);

export default function LinhaDoTempo({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const submenu = useSubmenuPilulas();
  const [eventos, setEventos] = useState<EventoTimeline[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [filtrosAtivos, setFiltrosAtivos] = useState<Set<string>>(new Set(TODOS_TIPOS));
  const [documentoAberto, setDocumentoAberto] = useState<{ href: string; titulo: string } | null>(null);

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
    <div style={{ marginBottom: 24, overflowX: "hidden" }}>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cor-texto-fraco)", margin: "0 0 10px" }}>
        Linha do tempo
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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 0, padding: "4px 0" }}>
        {[...eventosFiltrados].reverse().map((e, i, arr) => {
          const abaAlvo = e.tipo !== "consulta" ? ABA_POR_TIPO[e.tipo] : null;
          const clicavel = !!e.href || !!abaAlvo;
          const conteudo = (
            <>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--cor-texto-muito-fraco)", fontFamily: "var(--fonte-mono)", whiteSpace: "nowrap" }}>
                {new Date(e.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 11.5,
                  fontWeight: 600,
                  maxWidth: 120,
                  lineHeight: 1.3,
                  textDecoration: clicavel ? "underline" : "none",
                  textDecorationColor: "var(--cor-borda-input)",
                }}
              >
                {e.titulo}
              </p>
              {e.subtitulo && (
                <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "var(--cor-texto-fraco)", maxWidth: 120, lineHeight: 1.3 }}>{e.subtitulo}</p>
              )}
            </>
          );

          let nó = conteudo;
          if (e.href) {
            nó = (
              <button
                type="button"
                onClick={() => setDocumentoAberto({ href: e.href!, titulo: e.titulo })}
                style={{ background: "none", border: "none", padding: 0, margin: 0, color: "inherit", cursor: "pointer", textAlign: "center" }}
              >
                {conteudo}
              </button>
            );
          } else if (abaAlvo && submenu) {
            nó = (
              <button
                type="button"
                onClick={() => submenu.irPara(abaAlvo)}
                style={{ background: "none", border: "none", padding: 0, margin: 0, color: "inherit", cursor: "pointer", textAlign: "center" }}
              >
                {conteudo}
              </button>
            );
          }

          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 130, textAlign: "center" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: e.cor, border: "2px solid var(--cor-fundo)", boxShadow: "0 0 0 1px var(--cor-borda)" }} />
                {nó}
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 24, height: 1, background: "var(--cor-borda)", marginTop: 5, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {documentoAberto && (
        <ModalDocumento href={documentoAberto.href} titulo={documentoAberto.titulo} onFechar={() => setDocumentoAberto(null)} />
      )}
    </div>
  );
}
