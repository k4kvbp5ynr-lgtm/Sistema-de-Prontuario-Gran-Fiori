"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function CardIndicador({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div style={{ background: "var(--cor-fundo-card-alt)", border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 16 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--cor-texto-fraco)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "var(--fonte-mono)" }}>{valor}</p>
      {nota && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--cor-texto-fraco)" }}>{nota}</p>}
    </div>
  );
}

export default function Indicadores() {
  const supabase = createClient();
  const hoje = new Date();
  const [mesAno, setMesAno] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [carregando, setCarregando] = useState(false);

  const [taxaFalta, setTaxaFalta] = useState<number | null>(null);
  const [totalAgendamentos, setTotalAgendamentos] = useState(0);
  const [ticketMedio, setTicketMedio] = useState<number | null>(null);
  const [qtdProcedimentos, setQtdProcedimentos] = useState(0);
  const [tmaSegundos, setTmaSegundos] = useState<number | null>(null);
  const [totalConsultas, setTotalConsultas] = useState(0);

  async function carregar() {
    setCarregando(true);
    const [ano, mes] = mesAno.split("-").map(Number);
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);

    const { data: agendamentos } = await supabase
      .from("agendamentos")
      .select("status")
      .gte("data_hora", inicio.toISOString())
      .lt("data_hora", fim.toISOString())
      .neq("status", "cancelado");

    const total = agendamentos?.length ?? 0;
    const faltas = agendamentos?.filter((a) => a.status === "faltou").length ?? 0;
    setTotalAgendamentos(total);
    setTaxaFalta(total > 0 ? (faltas / total) * 100 : null);

    const { data: cobrancas } = await supabase
      .from("procedimentos_paciente")
      .select("valor_cobrado")
      .gte("data", inicio.toISOString().slice(0, 10))
      .lt("data", fim.toISOString().slice(0, 10))
      .not("valor_cobrado", "is", null);

    const valores = (cobrancas ?? []).map((c) => c.valor_cobrado as number);
    setTicketMedio(valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null);

    const { count: qtdProc } = await supabase
      .from("procedimentos_realizados")
      .select("id", { count: "exact", head: true })
      .gte("data_procedimento", inicio.toISOString().slice(0, 10))
      .lt("data_procedimento", fim.toISOString().slice(0, 10));
    setQtdProcedimentos(qtdProc ?? 0);

    const { data: encontros } = await supabase
      .from("encontros")
      .select("duracao_segundos")
      .gte("data_hora", inicio.toISOString())
      .lt("data_hora", fim.toISOString());

    setTotalConsultas(encontros?.length ?? 0);
    const duracoes = (encontros ?? []).map((e) => e.duracao_segundos).filter((d): d is number => d != null && d > 0);
    setTmaSegundos(duracoes.length > 0 ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : null);

    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesAno]);

  function formatarTMA(segundos: number) {
    const min = Math.round(segundos / 60);
    return `${min} min`;
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Indicadores</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11 }}>Mês</label>
        <input type="month" value={mesAno} onChange={(e) => setMesAno(e.target.value)} style={{ width: 160 }} />
      </div>

      {carregando ? (
        <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Calculando...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <CardIndicador
            label="Taxa de falta"
            valor={taxaFalta != null ? `${taxaFalta.toFixed(1)}%` : "—"}
            nota={`${totalAgendamentos} agendamento(s) no mês`}
          />
          <CardIndicador
            label="Ticket médio"
            valor={ticketMedio != null ? ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
            nota="Baseado em procedimentos com valor cobrado registrado"
          />
          <CardIndicador label="Procedimentos no mês" valor={String(qtdProcedimentos)} />
          <CardIndicador
            label="Tempo médio de atendimento"
            valor={tmaSegundos != null ? formatarTMA(tmaSegundos) : "—"}
            nota="Baseado no timer de consulta"
          />
          <CardIndicador label="Consultas registradas" valor={String(totalConsultas)} />
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", marginTop: 16 }}>
        Taxa de falta e consultas usam a data do agendamento/consulta. Ticket médio e procedimentos usam a data em que foram registrados.
      </p>
    </div>
  );
}
