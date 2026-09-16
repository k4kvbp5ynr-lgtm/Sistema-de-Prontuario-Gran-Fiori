"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Template = { id: string; regiao: string; campos: { nome: string; unidade: string }[] };
type Laudo = {
  id: string;
  regiao: string;
  data_exame: string;
  medidas: Record<string, string>;
  achados: string | null;
  conclusao: string | null;
};

export default function LaudoUsg({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [expandidoRegiao, setExpandidoRegiao] = useState<string | null>(null);

  const [regiaoSelecionada, setRegiaoSelecionada] = useState("");
  const [regiaoNova, setRegiaoNova] = useState("");
  const [camposNovos, setCamposNovos] = useState<{ nome: string; unidade: string }[]>([{ nome: "", unidade: "" }]);
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [dataExame, setDataExame] = useState(new Date().toISOString().slice(0, 10));
  const [achados, setAchados] = useState("");
  const [conclusao, setConclusao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const { data: t } = await supabase.from("usg_templates_regiao").select("id, regiao, campos").order("regiao");
    setTemplates((t as any) ?? []);
    const { data: l } = await supabase
      .from("usg_laudos")
      .select("id, regiao, data_exame, medidas, achados, conclusao")
      .eq("paciente_id", pacienteId)
      .order("data_exame", { ascending: false });
    setLaudos((l as any) ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  const templateAtual = templates.find((t) => t.regiao === regiaoSelecionada);
  const ehRegiaoNova = regiaoSelecionada === "__nova__";

  function abrirForm() {
    setFormAberto(true);
    setRegiaoSelecionada("");
    setRegiaoNova("");
    setCamposNovos([{ nome: "", unidade: "" }]);
    setMedidas({});
    setDataExame(new Date().toISOString().slice(0, 10));
    setAchados("");
    setConclusao("");
    setErro(null);
  }

  function adicionarCampoNovo() {
    setCamposNovos((atual) => [...atual, { nome: "", unidade: "" }]);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const regiaoFinal = ehRegiaoNova ? regiaoNova.trim() : regiaoSelecionada;
    if (!regiaoFinal) {
      setErro("Selecione ou digite a região.");
      return;
    }

    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let campos = templateAtual?.campos ?? [];
    let medidasFinais = medidas;

    if (ehRegiaoNova) {
      campos = camposNovos.filter((c) => c.nome.trim()).map((c) => ({ nome: c.nome.trim(), unidade: c.unidade.trim() }));
      if (campos.length === 0) {
        setErro("Adicione pelo menos um campo de medida para a nova região.");
        setSalvando(false);
        return;
      }
      medidasFinais = Object.fromEntries(campos.map((c) => [c.nome, medidas[c.nome] ?? ""]));

      const { error: erroTemplate } = await supabase.from("usg_templates_regiao").insert({
        regiao: regiaoFinal,
        campos,
        criado_por: user?.id,
      });
      if (erroTemplate) {
        setErro("Erro ao criar o modelo da região: " + erroTemplate.message);
        setSalvando(false);
        return;
      }
    }

    const { error } = await supabase.from("usg_laudos").insert({
      paciente_id: pacienteId,
      regiao: regiaoFinal,
      data_exame: dataExame,
      medidas: medidasFinais,
      achados: achados || null,
      conclusao: conclusao || null,
      profissional_id: user?.id,
      registrado_por: user?.id,
    });

    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar laudo: " + error.message);
      return;
    }

    setFormAberto(false);
    carregar();
  }

  const regioesComLaudos = Array.from(new Set(laudos.map((l) => l.regiao))).map((regiao) => ({
    regiao,
    laudos: laudos.filter((l) => l.regiao === regiao),
    template: templates.find((t) => t.regiao === regiao),
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Laudo de USG</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", margin: "2px 0 0" }}>
            Medidas em campos próprios, comparáveis entre exames.
          </p>
        </div>
        <button type="button" onClick={abrirForm} style={{ fontSize: 12 }}>
          {formAberto ? "Cancelar" : "Novo laudo"}
        </button>
      </div>

      {formAberto && (
        <form onSubmit={salvar} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          {erro && <p className="erro">{erro}</p>}

          <label style={{ fontSize: 11 }}>Região</label>
          <select
            value={regiaoSelecionada}
            onChange={(e) => {
              setRegiaoSelecionada(e.target.value);
              setMedidas({});
            }}
          >
            <option value="">Selecione</option>
            {templates.map((t) => (
              <option key={t.id} value={t.regiao}>
                {t.regiao}
              </option>
            ))}
            <option value="__nova__">+ Nova região</option>
          </select>

          {ehRegiaoNova && (
            <>
              <label style={{ fontSize: 11 }}>Nome da nova região</label>
              <input value={regiaoNova} onChange={(e) => setRegiaoNova(e.target.value)} placeholder="Ex: Ombro, Tendão de Aquiles" />

              <p style={{ fontSize: 11, fontWeight: 700, margin: "10px 0 6px" }}>Campos de medida desta região (defina uma vez, reutiliza depois)</p>
              {camposNovos.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <input
                    placeholder="Nome do campo (ex: Espessura do supraespinhal)"
                    value={c.nome}
                    onChange={(e) => {
                      const novo = [...camposNovos];
                      novo[i] = { ...novo[i], nome: e.target.value };
                      setCamposNovos(novo);
                    }}
                    style={{ flex: 2, marginBottom: 0 }}
                  />
                  <input
                    placeholder="Unidade (ex: mm)"
                    value={c.unidade}
                    onChange={(e) => {
                      const novo = [...camposNovos];
                      novo[i] = { ...novo[i], unidade: e.target.value };
                      setCamposNovos(novo);
                    }}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                </div>
              ))}
              <button type="button" onClick={adicionarCampoNovo} className="botao-secundario" style={{ fontSize: 11, padding: "4px 10px", marginBottom: 10 }}>
                + Adicionar campo
              </button>
            </>
          )}

          {templateAtual && !ehRegiaoNova && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 6px" }}>Medidas</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {templateAtual.campos.map((c) => (
                  <div key={c.nome}>
                    <label style={{ fontSize: 11 }}>
                      {c.nome} {c.unidade && `(${c.unidade})`}
                    </label>
                    <input value={medidas[c.nome] ?? ""} onChange={(e) => setMedidas((m) => ({ ...m, [c.nome]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <label style={{ fontSize: 11, marginTop: 10, display: "block" }}>Data do exame</label>
          <input type="date" value={dataExame} onChange={(e) => setDataExame(e.target.value)} />

          <label style={{ fontSize: 11 }}>Achados</label>
          <textarea value={achados} onChange={(e) => setAchados(e.target.value)} rows={3} style={{ width: "100%", padding: 8 }} />

          <label style={{ fontSize: 11 }}>Conclusão</label>
          <textarea value={conclusao} onChange={(e) => setConclusao(e.target.value)} rows={2} style={{ width: "100%", padding: 8 }} />

          <button type="submit" disabled={salvando} style={{ fontSize: 12, marginTop: 8 }}>
            {salvando ? "Salvando..." : "Salvar laudo"}
          </button>
        </form>
      )}

      {regioesComLaudos.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhum laudo registrado ainda.</p>}

      {regioesComLaudos.map(({ regiao, laudos: ls, template }) => {
        const expandido = expandidoRegiao === regiao;
        return (
          <div key={regiao} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpandidoRegiao(expandido ? null : regiao)}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                {regiao} <span style={{ fontWeight: 400, color: "var(--cor-texto-fraco)" }}>({ls.length} exame{ls.length > 1 ? "s" : ""})</span>
              </p>
              <span style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>{expandido ? "▾" : "▸"}</span>
            </div>

            {expandido && (
              <div style={{ marginTop: 12 }}>
                {template?.campos.map((campo) => {
                  const serie = ls
                    .map((l) => ({ data: l.data_exame, valor: parseFloat((l.medidas?.[campo.nome] ?? "").toString().replace(",", ".")) }))
                    .filter((p) => !isNaN(p.valor))
                    .reverse();
                  if (serie.length < 2) return null;
                  return (
                    <div key={campo.nome} style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>
                        {campo.nome} {campo.unidade && `(${campo.unidade})`}
                      </p>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={serie}>
                          <XAxis dataKey="data" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} />
                          <Line type="monotone" dataKey="valor" stroke="#3d9a91" strokeWidth={2} dot />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}

                {ls.map((l) => (
                  <div key={l.id} style={{ borderTop: "1px solid var(--cor-borda)", paddingTop: 10, marginTop: 10, fontSize: 12 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{new Date(l.data_exame + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                    {Object.entries(l.medidas ?? {}).map(([nome, valor]) => {
                      const unidade = template?.campos.find((c) => c.nome === nome)?.unidade ?? "";
                      return valor ? (
                        <p key={nome} style={{ margin: "2px 0" }}>
                          {nome}: <b>{valor}</b> {unidade}
                        </p>
                      ) : null;
                    })}
                    {l.achados && <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}><b>Achados:</b> {l.achados}</p>}
                    {l.conclusao && <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}><b>Conclusão:</b> {l.conclusao}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
