"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

type Grupo = { titulo: string; campos: { chave: string; label: string; unidade?: string }[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Peso, altura e metabolismo",
    campos: [
      { chave: "peso_kg", label: "Peso", unidade: "kg" },
      { chave: "altura_cm", label: "Altura", unidade: "cm" },
      { chave: "imc", label: "IMC", unidade: "kg/m²" },
      { chave: "circunferencia_abdominal_cm", label: "Circunferência abdominal", unidade: "cm" },
      { chave: "taxa_metabolica_basal_kcal", label: "Taxa metabólica basal", unidade: "kcal/24h" },
    ],
  },
  {
    titulo: "Gordura e massa magra",
    campos: [
      { chave: "massa_gorda_kg", label: "Massa gorda", unidade: "kg" },
      { chave: "percentual_gordura", label: "% Gordura", unidade: "%" },
      { chave: "massa_magra_kg", label: "Massa magra", unidade: "kg" },
      { chave: "percentual_massa_magra", label: "% Massa magra", unidade: "%" },
      { chave: "massa_muscular_kg", label: "Massa muscular", unidade: "kg" },
      { chave: "percentual_massa_muscular", label: "% Massa muscular", unidade: "%" },
      { chave: "razao_musculo_gordura", label: "Razão músculo/gordura" },
    ],
  },
  {
    titulo: "Hidratação",
    campos: [
      { chave: "agua_corporal_total_litros", label: "Água corporal total", unidade: "L" },
      { chave: "agua_corporal_percentual", label: "Água corporal", unidade: "%" },
      { chave: "indice_hidratacao", label: "Índice de hidratação" },
      { chave: "agua_massa_magra_percentual", label: "Água na massa magra", unidade: "%" },
      { chave: "agua_intracelular_litros", label: "Água intracelular", unidade: "L" },
      { chave: "agua_intracelular_percentual", label: "Água intracelular", unidade: "%" },
      { chave: "agua_extracelular_litros", label: "Água extracelular", unidade: "L" },
    ],
  },
  {
    titulo: "Análise celular",
    campos: [
      { chave: "angulo_fase_graus", label: "Ângulo de fase", unidade: "°" },
      { chave: "idade_celular", label: "Idade celular", unidade: "anos" },
    ],
  },
  {
    titulo: "Ventilometria / condicionamento",
    campos: [
      { chave: "vo2_max", label: "VO2 máx", unidade: "ml/kg/min" },
      { chave: "fc_limiar", label: "FC limiar", unidade: "bpm" },
      { chave: "fc_maxima", label: "FC máxima", unidade: "bpm" },
      { chave: "recuperacao_fc_60s", label: "Recuperação de FC em 60s", unidade: "bpm" },
      { chave: "ve_maxima", label: "VE máxima", unidade: "L/min" },
      { chave: "carga_limiar_w", label: "Carga limiar", unidade: "W" },
      { chave: "carga_maxima_w", label: "Carga máxima", unidade: "W" },
      { chave: "pressao_sistolica", label: "Pressão sistólica", unidade: "mmHg" },
      { chave: "pressao_diastolica", label: "Pressão diastólica", unidade: "mmHg" },
    ],
  },
];

export default function AvaliacaoFisicaForm({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [formAberto, setFormAberto] = useState(false);
  const [lista, setLista] = useState<any[]>([]);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [dataAvaliacao, setDataAvaliacao] = useState(new Date().toISOString().slice(0, 10));
  const [condicionamento, setCondicionamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [extraindo, setExtraindo] = useState(false);
  const [avisoExtracao, setAvisoExtracao] = useState<string | null>(null);

  async function carregar() {
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("data_avaliacao", { ascending: false });
    setLista(data ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function abrirForm() {
    setFormAberto(true);
    setValores({});
    setDataAvaliacao(new Date().toISOString().slice(0, 10));
    setCondicionamento("");
    setObservacoes("");
    setErro(null);
  }

  async function extrairDoPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setAvisoExtracao(null);
    setExtraindo(true);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      const resposta = await fetch("/api/ia/extrair-avaliacao-fisica", { method: "POST", body: formData });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Erro ao extrair dados do PDF.");
        setExtraindo(false);
        return;
      }

      const novos: Record<string, string> = { ...valores };
      for (const campo of CAMPOS_NUMERICOS) {
        const v = dados.extraido?.[campo];
        if (v != null) novos[campo] = String(v).replace(".", ",");
      }
      setValores(novos);
      if (dados.extraido?.condicionamento_fisico) setCondicionamento(dados.extraido.condicionamento_fisico);
      if (dados.extraido?.data_avaliacao) setDataAvaliacao(dados.extraido.data_avaliacao);
      if (dados.aviso) setAvisoExtracao(dados.aviso);
    } catch {
      setErro("Erro de conexão com a IA.");
    }
    setExtraindo(false);
    e.target.value = "";
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const registro: Record<string, any> = {
      paciente_id: pacienteId,
      data_avaliacao: dataAvaliacao,
      condicionamento_fisico: condicionamento || null,
      observacoes: observacoes || null,
      registrado_por: user?.id,
    };
    for (const campo of CAMPOS_NUMERICOS) {
      const bruto = valores[campo];
      registro[campo] = bruto ? parseFloat(bruto.replace(",", ".")) : null;
    }

    const { error } = await supabase.from("avaliacoes_fisicas").insert(registro);

    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setFormAberto(false);
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Avaliação física</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", margin: "2px 0 0" }}>
            Bioimpedância e ventilometria — preencha só o que o laudo trouxer. Alimenta o Dashboard do paciente.
          </p>
        </div>
        <button type="button" onClick={abrirForm} style={{ fontSize: 12 }}>
          {formAberto ? "Cancelar" : "Nova avaliação"}
        </button>
      </div>

      {formAberto && (
        <form onSubmit={salvar} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          {erro && <p className="erro">{erro}</p>}

          <div style={{ background: "var(--cor-ia-fundo)", border: "1px solid var(--cor-ia)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Extrair de um PDF (IA) — opcional
            </label>
            <input type="file" accept="application/pdf" onChange={extrairDoPdf} disabled={extraindo} style={{ marginBottom: 0 }} />
            {extraindo && <p style={{ fontSize: 12, margin: "6px 0 0", color: "var(--cor-ia)" }}>Lendo o PDF e extraindo os dados...</p>}
            {avisoExtracao && <p style={{ fontSize: 12, margin: "6px 0 0", color: "var(--cor-status-abaixo-texto)" }}>⚠ {avisoExtracao}</p>}
            <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", margin: "6px 0 0" }}>
              Preenche os campos abaixo automaticamente a partir do texto do PDF — revise antes de salvar. Funciona bem pra ventilometria; laudos de bioimpedância costumam ter a maioria dos valores em gráficos visuais, que essa extração não lê.
            </p>
          </div>

          <label style={{ fontSize: 11 }}>Data da avaliação</label>
          <input type="date" value={dataAvaliacao} onChange={(e) => setDataAvaliacao(e.target.value)} style={{ maxWidth: 200 }} />

          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cor-texto-fraco)", margin: "0 0 8px" }}>
                {grupo.titulo}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {grupo.campos.map((c) => (
                  <div key={c.chave}>
                    <label style={{ fontSize: 11 }}>
                      {c.label} {c.unidade && `(${c.unidade})`}
                    </label>
                    <input value={valores[c.chave] ?? ""} onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <label style={{ fontSize: 11, marginTop: 14, display: "block" }}>Condicionamento físico (classificação do laudo)</label>
          <input value={condicionamento} onChange={(e) => setCondicionamento(e.target.value)} placeholder="Ex: Atleta, Bom, Regular" />

          <label style={{ fontSize: 11 }}>Observações</label>
          <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} style={{ width: "100%", padding: 8 }} />

          <button type="submit" disabled={salvando} style={{ fontSize: 12, marginTop: 10 }}>
            {salvando ? "Salvando..." : "Salvar avaliação"}
          </button>
        </form>
      )}

      {lista.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhuma avaliação registrada ainda.</p>}

      {lista.map((av) => {
        const expandido = expandidoId === av.id;
        const camposPreenchidos = GRUPOS.flatMap((g) => g.campos).filter((c) => av[c.chave] != null);
        return (
          <div key={av.id} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpandidoId(expandido ? null : av.id)}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                {new Date(av.data_avaliacao + "T00:00:00").toLocaleDateString("pt-BR")}{" "}
                <span style={{ fontWeight: 400, color: "var(--cor-texto-fraco)" }}>({camposPreenchidos.length} campo(s) preenchido(s))</span>
              </p>
              <span style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>{expandido ? "▾" : "▸"}</span>
            </div>
            {expandido && (
              <div style={{ marginTop: 10, fontSize: 12 }}>
                {camposPreenchidos.map((c) => (
                  <p key={c.chave} style={{ margin: "2px 0" }}>
                    {c.label}: <b>{av[c.chave]}</b> {c.unidade}
                  </p>
                ))}
                {av.condicionamento_fisico && <p style={{ margin: "4px 0" }}><b>Condicionamento:</b> {av.condicionamento_fisico}</p>}
                {av.observacoes && <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}><b>Observações:</b> {av.observacoes}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
