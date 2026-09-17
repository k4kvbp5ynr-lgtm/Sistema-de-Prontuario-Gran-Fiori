"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function CardDado({ label, valor, unidade, cor }: { label: string; valor: string | number; unidade?: string; cor?: string }) {
  return (
    <div style={{ background: "var(--cor-fundo-card-alt)", border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--cor-texto-fraco)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "var(--fonte-mono)", color: cor ?? "var(--cor-texto)" }}>
        {valor} {unidade && <span style={{ fontSize: 12, fontWeight: 400 }}>{unidade}</span>}
      </p>
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

export default function DashboardPaciente({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [carregado, setCarregado] = useState(false);
  const [avaliacao, setAvaliacao] = useState<any>(null);
  const [paciente, setPaciente] = useState<any>(null);
  const [exames, setExames] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: pac } = await supabase.from("pacientes").select("peso, altura, data_nascimento, sexo").eq("id", pacienteId).single();
      setPaciente(pac);

      const { data: av } = await supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("data_avaliacao", { ascending: false })
        .limit(1)
        .maybeSingle();
      setAvaliacao(av);

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

  const peso = avaliacao?.peso_kg ?? paciente?.peso;
  const altura = avaliacao?.altura_cm ?? (paciente?.altura ? paciente.altura : null);
  const imc = avaliacao?.imc ?? (peso && altura ? peso / Math.pow(altura / 100, 2) : null);

  const examesAlterados = exames.filter((e) => e.status && e.status !== "normal").length;
  const totalExames = exames.length;

  const ultimaPorEscala = new Map<string, any>();
  for (const e of escalas) {
    const sigla = e.escalas_desfecho?.sigla;
    if (sigla && !ultimaPorEscala.has(sigla)) ultimaPorEscala.set(sigla, e);
  }

  const temComposicao = !!(peso || altura || imc || avaliacao?.circunferencia_abdominal_cm || avaliacao?.taxa_metabolica_basal_kcal);
  const temGordura = !!(avaliacao?.massa_gorda_kg || avaliacao?.percentual_gordura || avaliacao?.massa_magra_kg || avaliacao?.massa_muscular_kg || avaliacao?.razao_musculo_gordura);
  const temHidratacao = !!(avaliacao?.agua_corporal_total_litros || avaliacao?.indice_hidratacao || avaliacao?.agua_intracelular_percentual);
  const temCondicionamento = !!(avaliacao?.vo2_max || avaliacao?.fc_maxima || avaliacao?.fc_limiar || avaliacao?.recuperacao_fc_60s || avaliacao?.condicionamento_fisico || avaliacao?.pressao_sistolica);
  const temExames = totalExames > 0;
  const temEscalas = ultimaPorEscala.size > 0;

  const nadaPreenchido = !temComposicao && !temGordura && !temHidratacao && !temCondicionamento && !temExames && !temEscalas;

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Dashboard</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", marginBottom: 16 }}>
        Resumo visual do paciente — só aparece o que já foi preenchido em algum lugar do prontuário.
      </p>

      {nadaPreenchido && (
        <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
          Ainda não há dados suficientes. Preencha uma Avaliação física, exames de análises clínicas ou escalas de desfecho para este paciente.
        </p>
      )}

      <Secao titulo="Composição corporal" temConteudo={temComposicao}>
        {peso != null && <CardDado label="Peso" valor={peso} unidade="kg" />}
        {altura != null && <CardDado label="Altura" valor={(altura / (altura > 3 ? 100 : 1)).toFixed(2)} unidade="m" />}
        {imc != null && <CardDado label="IMC" valor={Number(imc).toFixed(1)} unidade="kg/m²" />}
        {avaliacao?.circunferencia_abdominal_cm != null && <CardDado label="Circunf. abdominal" valor={avaliacao.circunferencia_abdominal_cm} unidade="cm" />}
        {avaliacao?.taxa_metabolica_basal_kcal != null && <CardDado label="Taxa metabólica basal" valor={avaliacao.taxa_metabolica_basal_kcal} unidade="kcal/24h" />}
      </Secao>

      <Secao titulo="Gordura e massa magra" temConteudo={temGordura}>
        {avaliacao?.percentual_gordura != null && <CardDado label="% Gordura" valor={avaliacao.percentual_gordura} unidade="%" />}
        {avaliacao?.massa_gorda_kg != null && <CardDado label="Massa gorda" valor={avaliacao.massa_gorda_kg} unidade="kg" />}
        {avaliacao?.percentual_massa_magra != null && <CardDado label="% Massa magra" valor={avaliacao.percentual_massa_magra} unidade="%" />}
        {avaliacao?.massa_magra_kg != null && <CardDado label="Massa magra" valor={avaliacao.massa_magra_kg} unidade="kg" />}
        {avaliacao?.massa_muscular_kg != null && <CardDado label="Massa muscular" valor={avaliacao.massa_muscular_kg} unidade="kg" />}
        {avaliacao?.razao_musculo_gordura != null && <CardDado label="Razão músculo/gordura" valor={avaliacao.razao_musculo_gordura} />}
      </Secao>

      <Secao titulo="Hidratação" temConteudo={temHidratacao}>
        {avaliacao?.agua_corporal_percentual != null && <CardDado label="Água corporal" valor={avaliacao.agua_corporal_percentual} unidade="%" />}
        {avaliacao?.agua_corporal_total_litros != null && <CardDado label="Água corporal total" valor={avaliacao.agua_corporal_total_litros} unidade="L" />}
        {avaliacao?.indice_hidratacao != null && <CardDado label="Índice de hidratação" valor={avaliacao.indice_hidratacao} />}
        {avaliacao?.agua_intracelular_percentual != null && <CardDado label="Água intracelular" valor={avaliacao.agua_intracelular_percentual} unidade="%" />}
      </Secao>

      <Secao titulo="Condicionamento cardiorrespiratório" temConteudo={temCondicionamento}>
        {avaliacao?.condicionamento_fisico && <CardDado label="Classificação" valor={avaliacao.condicionamento_fisico} />}
        {avaliacao?.vo2_max != null && <CardDado label="VO2 máx" valor={avaliacao.vo2_max} unidade="ml/kg/min" />}
        {avaliacao?.fc_maxima != null && <CardDado label="FC máxima" valor={avaliacao.fc_maxima} unidade="bpm" />}
        {avaliacao?.fc_limiar != null && <CardDado label="FC limiar" valor={avaliacao.fc_limiar} unidade="bpm" />}
        {avaliacao?.recuperacao_fc_60s != null && (
          <CardDado label="Recuperação FC (60s)" valor={avaliacao.recuperacao_fc_60s} unidade="bpm" cor={avaliacao.recuperacao_fc_60s <= -25 ? "var(--cor-sucesso)" : undefined} />
        )}
        {avaliacao?.pressao_sistolica != null && avaliacao?.pressao_diastolica != null && (
          <CardDado label="Pressão arterial" valor={`${avaliacao.pressao_sistolica}/${avaliacao.pressao_diastolica}`} unidade="mmHg" />
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
          <CardDado key={sigla} label={e.escalas_desfecho?.nome ?? sigla} valor={e.pontuacao} />
        ))}
      </Secao>
    </div>
  );
}
