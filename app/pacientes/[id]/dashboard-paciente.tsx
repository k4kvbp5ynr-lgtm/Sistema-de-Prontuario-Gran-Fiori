"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CAMPOS_NUMERICOS = [
  "peso_kg", "altura_cm", "circunferencia_abdominal_cm", "imc", "taxa_metabolica_basal_kcal",
  "massa_gorda_kg", "percentual_gordura",
  "massa_magra_kg", "percentual_massa_magra", "massa_muscular_kg", "percentual_massa_muscular", "razao_musculo_gordura",
  "agua_corporal_total_litros", "agua_corporal_percentual", "indice_hidratacao", "agua_massa_magra_percentual",
  "agua_intracelular_litros", "agua_intracelular_percentual", "agua_extracelular_litros",
  "angulo_fase_graus", "idade_celular",
  "vo2_max", "fc_limiar", "fc_maxima", "recuperacao_fc_60s", "ve_maxima", "carga_limiar_w", "carga_maxima_w",
  "pressao_sistolica", "pressao_diastolica",
] as const;

function CardDado({ label, valor, unidade, cor, data }: { label: string; valor: string | number; unidade?: string; cor?: string; data?: string }) {
  return (
    <div style={{ background: "var(--cor-fundo-card-alt)", border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--cor-texto-fraco)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "var(--fonte-mono)", color: cor ?? "var(--cor-texto)" }}>
        {valor} {unidade && <span style={{ fontSize: 12, fontWeight: 400 }}>{unidade}</span>}
      </p>
      {data && <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--cor-texto-muito-fraco)" }}>{new Date(data + "T00:00:00").toLocaleDateString("pt-BR")}</p>}
    </div>
  );
}

function Secao({ titulo, children, temConteudo }: { titulo: string; children: React.ReactNode; temConteudo: boolean }) {
  if (!temConteudo) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cor-texto-fraco)", margin: "0 0 10px" }}>
        {titulo}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>{children}</div>
    </div>
  );
}

function GraficoTendencia({ label, unidade, serie, decimal }: { label: string; unidade?: string; serie: { data: string; valor: number }[]; decimal?: boolean }) {
  if (serie.length < 2) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>
        {label} {unidade && `(${unidade})`}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <XAxis dataKey="data" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} fontSize={11} />
          <YAxis fontSize={11} domain={[0, "auto"]} tickFormatter={(v) => (decimal ? v.toFixed(1) : String(v))} width={44} />
          <Tooltip
            labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}
            formatter={(v: any) => [decimal ? Number(v).toFixed(1) : v, "Valor"]}
          />
          <Line type="monotone" dataKey="valor" stroke="#3d9a91" strokeWidth={2.5} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPaciente({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [carregado, setCarregado] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]); // todas, mais antiga primeiro
  const [paciente, setPaciente] = useState<any>(null);
  const [exames, setExames] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [verTendencias, setVerTendencias] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: pac } = await supabase.from("pacientes").select("peso, altura, data_nascimento, sexo").eq("id", pacienteId).single();
      setPaciente(pac);

      const { data: avs } = await supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("data_avaliacao", { ascending: true });
      setAvaliacoes(avs ?? []);

      const { data: ultimaData } = await supabase
        .from("resultados_exames_paciente")
        .select("data_exame")
        .eq("paciente_id", pacienteId)
        .order("data_exame", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimaData?.data_exame) {
        const { data: res } = await supabase
          .from("resultados_exames_paciente")
          .select("status")
          .eq("paciente_id", pacienteId)
          .eq("data_exame", ultimaData.data_exame);
        setExames(res ?? []);
      }

      const { data: esc } = await supabase
        .from("respostas_escala")
        .select("pontuacao, data_aplicacao, escalas_desfecho(sigla, nome, maior_e_melhor)")
        .eq("paciente_id", pacienteId)
        .order("data_aplicacao", { ascending: false });
      setEscalas((esc as any) ?? []);

      setCarregado(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  if (!carregado) return <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Carregando...</p>;

  // Pra cada campo, acha o valor mais recente NÃO NULO entre todas as avaliações
  // (antes só olhava a avaliação mais recente inteira — se um campo só tinha sido
  // preenchido numa avaliação anterior, sumia do Dashboard).
  function ultimoValor(campo: string): { valor: number; data: string } | null {
    for (let i = avaliacoes.length - 1; i >= 0; i--) {
      const v = avaliacoes[i][campo];
      if (v != null) return { valor: v, data: avaliacoes[i].data_avaliacao };
    }
    return null;
  }

  function serieDoCampo(campo: string) {
    return avaliacoes.filter((a) => a[campo] != null).map((a) => ({ data: a.data_avaliacao, valor: a[campo] }));
  }

  const ultimoCondicionamento = [...avaliacoes].reverse().find((a) => a.condicionamento_fisico)?.condicionamento_fisico ?? null;

  const dados: Record<string, { valor: number; data: string } | null> = {};
  for (const campo of CAMPOS_NUMERICOS) dados[campo] = ultimoValor(campo);

  const pesoDado = dados.peso_kg ?? (paciente?.peso ? { valor: paciente.peso, data: "" } : null);
  const alturaDado = dados.altura_cm ?? (paciente?.altura ? { valor: paciente.altura, data: "" } : null);
  const imcDado = dados.imc ?? (pesoDado && alturaDado ? { valor: pesoDado.valor / Math.pow(alturaDado.valor / 100, 2), data: pesoDado.data } : null);

  const examesAlterados = exames.filter((e) => e.status && e.status !== "normal").length;
  const totalExames = exames.length;

  const ultimaPorEscala = new Map<string, any>();
  for (const e of escalas) {
    const sigla = e.escalas_desfecho?.sigla;
    if (sigla && !ultimaPorEscala.has(sigla)) ultimaPorEscala.set(sigla, e);
  }

  const temComposicao = !!(pesoDado || alturaDado || imcDado || dados.circunferencia_abdominal_cm || dados.taxa_metabolica_basal_kcal);
  const temGordura = !!(dados.massa_gorda_kg || dados.percentual_gordura || dados.massa_magra_kg || dados.massa_muscular_kg || dados.razao_musculo_gordura);
  const temHidratacao = !!(dados.agua_corporal_total_litros || dados.indice_hidratacao || dados.agua_intracelular_percentual);
  const temCondicionamento = !!(dados.vo2_max || dados.fc_maxima || dados.fc_limiar || dados.recuperacao_fc_60s || ultimoCondicionamento || dados.pressao_sistolica);
  const temExames = totalExames > 0;
  const temEscalas = ultimaPorEscala.size > 0;

  const nadaPreenchido = !temComposicao && !temGordura && !temHidratacao && !temCondicionamento && !temExames && !temEscalas;

  // Monta a lista de campos com tendência (2+ pontos) pra seção de gráficos
  const TODOS_CAMPOS_LABEL: { chave: string; label: string; unidade?: string; decimal?: boolean }[] = [
    { chave: "peso_kg", label: "Peso", unidade: "kg", decimal: true },
    { chave: "imc", label: "IMC", unidade: "kg/m²", decimal: true },
    { chave: "circunferencia_abdominal_cm", label: "Circunf. abdominal", unidade: "cm" },
    { chave: "percentual_gordura", label: "% Gordura", unidade: "%", decimal: true },
    { chave: "massa_gorda_kg", label: "Massa gorda", unidade: "kg", decimal: true },
    { chave: "massa_magra_kg", label: "Massa magra", unidade: "kg", decimal: true },
    { chave: "massa_muscular_kg", label: "Massa muscular", unidade: "kg", decimal: true },
    { chave: "razao_musculo_gordura", label: "Razão músculo/gordura", decimal: true },
    { chave: "agua_corporal_percentual", label: "Água corporal", unidade: "%", decimal: true },
    { chave: "indice_hidratacao", label: "Índice de hidratação", decimal: true },
    { chave: "angulo_fase_graus", label: "Ângulo de fase", unidade: "°", decimal: true },
    { chave: "vo2_max", label: "VO2 máx", unidade: "ml/kg/min", decimal: true },
    { chave: "fc_maxima", label: "FC máxima", unidade: "bpm" },
    { chave: "fc_limiar", label: "FC limiar", unidade: "bpm" },
    { chave: "recuperacao_fc_60s", label: "Recuperação FC (60s)", unidade: "bpm" },
    { chave: "pressao_sistolica", label: "Pressão sistólica", unidade: "mmHg" },
  ];
  const campoComTendencia = TODOS_CAMPOS_LABEL.map((c) => ({ ...c, serie: serieDoCampo(c.chave) })).filter((c) => c.serie.length >= 2);

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Dashboard</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", marginBottom: 16 }}>
        Resumo visual do paciente — só aparece o que já foi preenchido em algum lugar do prontuário. Cada campo mostra o valor mais recente registrado, mesmo que tenha sido em avaliações diferentes.
      </p>

      {nadaPreenchido && (
        <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
          Ainda não há dados suficientes. Preencha uma Avaliação física, exames de análises clínicas ou escalas de desfecho para este paciente.
        </p>
      )}

      <Secao titulo="Composição corporal" temConteudo={temComposicao}>
        {pesoDado && <CardDado label="Peso" valor={pesoDado.valor} unidade="kg" data={pesoDado.data} />}
        {alturaDado && <CardDado label="Altura" valor={(alturaDado.valor / (alturaDado.valor > 3 ? 100 : 1)).toFixed(2)} unidade="m" data={alturaDado.data} />}
        {imcDado && <CardDado label="IMC" valor={imcDado.valor.toFixed(1)} unidade="kg/m²" data={imcDado.data} />}
        {dados.circunferencia_abdominal_cm && <CardDado label="Circunf. abdominal" valor={dados.circunferencia_abdominal_cm.valor} unidade="cm" data={dados.circunferencia_abdominal_cm.data} />}
        {dados.taxa_metabolica_basal_kcal && <CardDado label="Taxa metabólica basal" valor={dados.taxa_metabolica_basal_kcal.valor} unidade="kcal/24h" data={dados.taxa_metabolica_basal_kcal.data} />}
      </Secao>

      <Secao titulo="Gordura e massa magra" temConteudo={temGordura}>
        {dados.percentual_gordura && <CardDado label="% Gordura" valor={dados.percentual_gordura.valor} unidade="%" data={dados.percentual_gordura.data} />}
        {dados.massa_gorda_kg && <CardDado label="Massa gorda" valor={dados.massa_gorda_kg.valor} unidade="kg" data={dados.massa_gorda_kg.data} />}
        {dados.percentual_massa_magra && <CardDado label="% Massa magra" valor={dados.percentual_massa_magra.valor} unidade="%" data={dados.percentual_massa_magra.data} />}
        {dados.massa_magra_kg && <CardDado label="Massa magra" valor={dados.massa_magra_kg.valor} unidade="kg" data={dados.massa_magra_kg.data} />}
        {dados.massa_muscular_kg && <CardDado label="Massa muscular" valor={dados.massa_muscular_kg.valor} unidade="kg" data={dados.massa_muscular_kg.data} />}
        {dados.razao_musculo_gordura && <CardDado label="Razão músculo/gordura" valor={dados.razao_musculo_gordura.valor} data={dados.razao_musculo_gordura.data} />}
      </Secao>

      <Secao titulo="Hidratação" temConteudo={temHidratacao}>
        {dados.agua_corporal_percentual && <CardDado label="Água corporal" valor={dados.agua_corporal_percentual.valor} unidade="%" data={dados.agua_corporal_percentual.data} />}
        {dados.agua_corporal_total_litros && <CardDado label="Água corporal total" valor={dados.agua_corporal_total_litros.valor} unidade="L" data={dados.agua_corporal_total_litros.data} />}
        {dados.indice_hidratacao && <CardDado label="Índice de hidratação" valor={dados.indice_hidratacao.valor} data={dados.indice_hidratacao.data} />}
        {dados.agua_intracelular_percentual && <CardDado label="Água intracelular" valor={dados.agua_intracelular_percentual.valor} unidade="%" data={dados.agua_intracelular_percentual.data} />}
      </Secao>

      <Secao titulo="Condicionamento cardiorrespiratório" temConteudo={temCondicionamento}>
        {ultimoCondicionamento && <CardDado label="Classificação" valor={ultimoCondicionamento} />}
        {dados.vo2_max && <CardDado label="VO2 máx" valor={dados.vo2_max.valor} unidade="ml/kg/min" data={dados.vo2_max.data} />}
        {dados.fc_maxima && <CardDado label="FC máxima" valor={dados.fc_maxima.valor} unidade="bpm" data={dados.fc_maxima.data} />}
        {dados.fc_limiar && <CardDado label="FC limiar" valor={dados.fc_limiar.valor} unidade="bpm" data={dados.fc_limiar.data} />}
        {dados.recuperacao_fc_60s && (
          <CardDado label="Recuperação FC (60s)" valor={dados.recuperacao_fc_60s.valor} unidade="bpm" data={dados.recuperacao_fc_60s.data} cor={dados.recuperacao_fc_60s.valor <= -25 ? "var(--cor-sucesso)" : undefined} />
        )}
        {dados.pressao_sistolica && dados.pressao_diastolica && (
          <CardDado label="Pressão arterial" valor={`${dados.pressao_sistolica.valor}/${dados.pressao_diastolica.valor}`} unidade="mmHg" data={dados.pressao_sistolica.data} />
        )}
      </Secao>

      <Secao titulo="Exames laboratoriais" temConteudo={temExames}>
        <CardDado
          label="Exames alterados (última coleta)"
          valor={`${examesAlterados} de ${totalExames}`}
          cor={examesAlterados > 0 ? "var(--cor-erro)" : "var(--cor-sucesso)"}
        />
      </Secao>

      <Secao titulo="Escalas de dor e desfecho" temConteudo={temEscalas}>
        {Array.from(ultimaPorEscala.entries()).map(([sigla, e]) => (
          <CardDado key={sigla} label={e.escalas_desfecho?.nome ?? sigla} valor={e.pontuacao} data={e.data_aplicacao} />
        ))}
      </Secao>

      {campoComTendencia.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={() => setVerTendencias(!verTendencias)} className="botao-secundario" style={{ fontSize: 12, marginBottom: 12 }}>
            {verTendencias ? "Esconder gráficos de tendência" : `Ver gráficos de tendência (${campoComTendencia.length})`}
          </button>
          {verTendencias && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {campoComTendencia.map((c) => (
                <GraficoTendencia key={c.chave} label={c.label} unidade={c.unidade} serie={c.serie} decimal={c.decimal} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

