"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Conexao = { provider: string; conectado_em: string; ultima_sincronizacao: string | null; ativo: boolean };
type Metrica = {
  data: string;
  readiness_score: number | null;
  sleep_score: number | null;
  activity_score: number | null;
  sono_total_minutos: number | null;
  fc_repouso: number | null;
  hrv: number | null;
  spo2: number | null;
};

function GraficoWearable({ label, unidade, serie, decimal }: { label: string; unidade?: string; serie: { data: string; valor: number }[]; decimal?: boolean }) {
  if (serie.length < 2) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>
        {label} {unidade && `(${unidade})`}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <XAxis dataKey="data" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} fontSize={10} />
          <YAxis fontSize={10} domain={[0, "auto"]} tickFormatter={(v) => (decimal ? v.toFixed(1) : String(v))} width={38} />
          <Tooltip labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} />
          <Line type="monotone" dataKey="valor" stroke="#a3b5e0" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Wearables({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [conexao, setConexao] = useState<Conexao | null>(null);
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [janela, setJanela] = useState(30);

  async function carregar() {
    const { data: conexaoData } = await supabase
      .from("wearable_connections")
      .select("provider, conectado_em, ultima_sincronizacao, ativo")
      .eq("paciente_id", pacienteId)
      .eq("provider", "oura")
      .eq("ativo", true)
      .maybeSingle();
    setConexao(conexaoData ?? null);

    const { data: metricasData } = await supabase
      .from("wearable_daily_metrics")
      .select("data, readiness_score, sleep_score, activity_score, sono_total_minutos, fc_repouso, hrv, spo2")
      .eq("paciente_id", pacienteId)
      .eq("provider", "oura")
      .order("data", { ascending: true });
    setMetricas(metricasData ?? []);
    setCarregado(true);
  }

  useEffect(() => {
    carregar();
    if (searchParams.get("oura_conectado")) setMensagem('Oura Ring conectado com sucesso! Clique em "Sincronizar agora" pra trazer os dados.');
    if (searchParams.get("erro_oura")) setErro(decodeURIComponent(searchParams.get("erro_oura")!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function sincronizar() {
    setSincronizando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/integracoes/oura/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Erro ao sincronizar.");
      } else {
        setMensagem(`Sincronizado! ${dados.diasSincronizados} dia(s) atualizados.`);
        if (dados.avisoParcial) setErro(dados.avisoParcial);
        carregar();
      }
    } catch {
      setErro("Erro de conexão ao sincronizar.");
    }
    setSincronizando(false);
  }

  async function desconectar() {
    if (!confirm("Desconectar o Oura Ring deste paciente? O histórico já sincronizado é mantido.")) return;
    await supabase.from("wearable_connections").update({ ativo: false }).eq("paciente_id", pacienteId).eq("provider", "oura");
    carregar();
  }

  if (!carregado) return <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Carregando...</p>;

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - janela);
  const metricasFiltradas = metricas.filter((m) => new Date(m.data + "T00:00:00") >= dataLimite);

  function serie(campo: keyof Metrica) {
    return metricasFiltradas.filter((m) => m[campo] != null).map((m) => ({ data: m.data, valor: m[campo] as number }));
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Sono e recuperação</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", marginBottom: 16 }}>
        Dados sincronizados de wearables — hoje só Oura Ring, fase de validação com 1 paciente.
      </p>

      {erro && <p className="erro">{erro}</p>}
      {mensagem && <p style={{ color: "var(--cor-sucesso)", fontSize: 12, margin: "0 0 12px" }}>✓ {mensagem}</p>}

      <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 10px" }}>Dispositivos conectados</p>

        {!conexao ? (
          <a href={`/api/integracoes/oura/conectar?pacienteId=${pacienteId}`}>
            <button type="button" style={{ fontSize: 12 }}>
              Conectar Oura Ring
            </button>
          </a>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>🟢 Oura Ring conectado</span>
            <span style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>
              Última sincronização:{" "}
              {conexao.ultima_sincronizacao ? new Date(conexao.ultima_sincronizacao).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "nunca"}
            </span>
            <button type="button" onClick={sincronizar} disabled={sincronizando} style={{ fontSize: 12 }}>
              {sincronizando ? "Sincronizando..." : "Sincronizar agora"}
            </button>
            <button type="button" onClick={desconectar} className="botao-secundario" style={{ fontSize: 12 }}>
              Desconectar
            </button>
          </div>
        )}
      </div>

      {metricas.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[7, 30, 90].map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => setJanela(dias)}
                className={janela === dias ? undefined : "botao-secundario"}
                style={{ fontSize: 11, padding: "5px 12px" }}
              >
                {dias} dias
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            <GraficoWearable label="Readiness (prontidão)" serie={serie("readiness_score")} />
            <GraficoWearable label="Sleep Score" serie={serie("sleep_score")} />
            <GraficoWearable label="Activity Score" serie={serie("activity_score")} />
            <GraficoWearable label="Sono total" unidade="min" serie={serie("sono_total_minutos")} />
            <GraficoWearable label="FC de repouso" unidade="bpm" serie={serie("fc_repouso")} />
            <GraficoWearable label="HRV" unidade="ms" serie={serie("hrv")} decimal />
            <GraficoWearable label="SpO2" unidade="%" serie={serie("spo2")} decimal />
          </div>
        </>
      )}

      {conexao && metricas.length === 0 && (
        <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Ainda não há dados sincronizados — clique em "Sincronizar agora" acima.</p>
      )}
    </div>
  );
}
