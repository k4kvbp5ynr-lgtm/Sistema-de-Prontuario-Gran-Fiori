"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ND = "Não disponível nesta base.";

const NOMES_POPULACAO: Record<string, string> = {
  af: "Global",
  af_afr: "Africana",
  af_amr: "Americana",
  af_eas: "Leste Asiático",
  af_nfe: "Europeia (não finlandesa)",
  af_fin: "Finlandesa",
  af_asj: "Judaica Asquenaze",
  af_oth: "Outras",
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 14, background: "var(--cor-fundo-card)", marginBottom: 12 }}>
      <p style={{ fontWeight: "bold", margin: "0 0 8px", color: "var(--cor-marca)" }}>{titulo}</p>
      {children}
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: any }) {
  const texto = valor === null || valor === undefined || valor === "" ? ND : String(valor);
  return (
    <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
      <b>{label}:</b> {texto}
    </p>
  );
}

function Expansivel({ label, children }: { label: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ marginTop: 6 }}>
      <button type="button" onClick={() => setAberto(!aberto)} style={{ fontSize: "0.78rem", padding: "3px 8px", background: "var(--cor-fundo-card-alt)", color: "var(--cor-texto)" }}>
        {aberto ? "▾" : "▸"} {label}
      </button>
      {aberto && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
}

function SecaoFrequencias({ frequencias }: { frequencias: any }) {
  if (!frequencias || typeof frequencias !== "object") return <p style={{ fontSize: "0.9rem" }}>{ND}</p>;
  const principais = ["af", "af_afr", "af_amr", "af_eas", "af_nfe"];
  const outras = Object.keys(frequencias).filter((k) => !principais.includes(k));

  return (
    <div>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", margin: "0 0 6px" }}>Frequência do alelo ALT na população:</p>
      {principais
        .filter((k) => frequencias[k] !== undefined)
        .map((k) => (
          <Campo key={k} label={NOMES_POPULACAO[k] ?? k} valor={`${(frequencias[k] * 100).toFixed(1)}%`} />
        ))}
      {outras.length > 0 && (
        <Expansivel label="Ver todas as populações">
          {outras.map((k) => (
            <Campo key={k} label={k} valor={typeof frequencias[k] === "number" ? `${(frequencias[k] * 100).toFixed(2)}%` : frequencias[k]} />
          ))}
        </Expansivel>
      )}
    </div>
  );
}

function SecaoPathways({ pathways }: { pathways: any[] }) {
  if (!pathways || pathways.length === 0) return <p style={{ fontSize: "0.9rem" }}>{ND}</p>;
  const visiveis = pathways.slice(0, 6);
  const resto = pathways.slice(6);
  return (
    <div>
      <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: "0.88rem" }}>
        {visiveis.map((p, i) => (
          <li key={i}>
            {p.nome} — {p.fonte}
          </li>
        ))}
      </ul>
      {resto.length > 0 && (
        <Expansivel label={`Ver mais ${resto.length} vias biológicas`}>
          <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: "0.88rem" }}>
            {resto.map((p, i) => (
              <li key={i}>
                {p.nome} — {p.fonte}
              </li>
            ))}
          </ul>
        </Expansivel>
      )}
    </div>
  );
}

function SecaoClinVar({ clinvar }: { clinvar: any }) {
  if (!clinvar || clinvar.indisponivel || !Array.isArray(clinvar) || clinvar.length === 0) {
    return <p style={{ fontSize: "0.9rem", color: "var(--cor-texto-fraco)" }}>Não disponível no ClinVar.</p>;
  }
  const visiveis = clinvar.slice(0, 3);
  const resto = clinvar.slice(3);

  const linha = (c: any, i: number) => (
    <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--cor-borda)" }}>
      <Campo label="Significância clínica" valor={c.significancia_clinica} />
      <Campo label="Condições associadas" valor={c.condicoes?.join(", ")} />
      <Campo label="Review status" valor={c.review_status} />
      <Campo label="Accession" valor={c.accession} />
      <Campo label="Última atualização" valor={c.ultima_atualizacao} />
    </div>
  );

  return (
    <div>
      {visiveis.map(linha)}
      {resto.length > 0 && <Expansivel label={`Ver mais ${resto.length} registro(s) do ClinVar`}>{resto.map(linha)}</Expansivel>}
    </div>
  );
}

function SecaoGWAS({ gwas }: { gwas: any }) {
  if (!gwas || gwas.indisponivel) {
    return (
      <p style={{ fontSize: "0.9rem", color: "var(--cor-texto-fraco)" }}>
        GWAS Catalog temporariamente indisponível{gwas?.motivo ? ` (${gwas.motivo})` : ""}.
      </p>
    );
  }
  if (!gwas.grupos || gwas.grupos.length === 0) {
    return <p style={{ fontSize: "0.9rem", color: "var(--cor-texto-fraco)" }}>Nenhuma associação encontrada no GWAS Catalog para essa variante.</p>;
  }

  return (
    <div>
      {gwas.grupos.map((g: any, i: number) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: "4px 0", fontWeight: "bold", fontSize: "0.9rem" }}>
            {g.trait} <span style={{ fontWeight: "normal", color: "var(--cor-texto-fraco)" }}>({g.total} estudo{g.total > 1 ? "s" : ""})</span>
          </p>
          <Expansivel label="Ver estudos">
            {g.estudos.map((e: any, j: number) => (
              <div key={j} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--cor-borda)", fontSize: "0.85rem" }}>
                <Campo label="Alelo de efeito" valor={e.effect_allele} />
                <Campo label="Genótipo do paciente / cópias do alelo de efeito" valor={e.copias_alelo_efeito !== null ? `${e.copias_alelo_efeito} cópia(s)` : ND} />
                {e.or_value != null && (
                  <p style={{ margin: "4px 0" }}>
                    <b>Odds Ratio:</b> {e.or_value} {e.interpretacao_or && `— ${e.interpretacao_or}`}
                  </p>
                )}
                {e.beta != null && (
                  <p style={{ margin: "4px 0" }}>
                    <b>Beta:</b> {e.beta} {e.beta_unit ?? ""} {e.interpretacao_beta && `— ${e.interpretacao_beta}`}
                  </p>
                )}
                <p style={{ margin: "4px 0" }}>
                  <b>P-value:</b> {e.p_value ?? ND} {e.significancia_genomica && `— ${e.significancia_genomica}`}
                </p>
                <Campo label="Frequência do alelo de efeito" valor={e.frequencia_alelo_efeito} />
                <Campo label="População/amostra" valor={e.populacao} />
                <Campo label="Estudo" valor={e.titulo_estudo} />
                {e.pubmed_id && (
                  <p style={{ margin: "4px 0" }}>
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${e.pubmed_id}`} target="_blank" rel="noreferrer">
                      PubMed {e.pubmed_id} →
                    </a>
                  </p>
                )}
              </div>
            ))}
          </Expansivel>
        </div>
      ))}
    </div>
  );
}

export default function ConsultaGenetica({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [historico, setHistorico] = useState<any[]>([]);
  const [rsid, setRsid] = useState("");
  const [genotype, setGenotype] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);

  async function carregarHistorico() {
    const { data } = await supabase
      .from("consultas_geneticas")
      .select("id, rsid, genotipo_informado, gene_symbol, significancia_clinica, criado_em")
      .eq("paciente_id", pacienteId)
      .order("criado_em", { ascending: false });
    setHistorico(data ?? []);
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function analisar(e: React.FormEvent) {
    e.preventDefault();
    if (!rsid.trim() || !genotype.trim()) return;
    setErro(null);
    setConsultando(true);
    setResultado(null);

    try {
      const resposta = await fetch("/api/genetica/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId, rsid: rsid.trim(), genotype: genotype.trim() }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Erro ao consultar.");
      } else {
        setResultado(dados);
        carregarHistorico();
      }
    } catch {
      setErro("Erro de conexão.");
    }
    setConsultando(false);
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>🧬 Consulta genética</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
        Consulta determinística, sem uso de IA — MyVariant.info, MyGene.info, ClinVar/NCBI e GWAS Catalog (EMBL-EBI).
      </p>

      <form onSubmit={analisar} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="rsID (ex: rs429358)" value={rsid} onChange={(e) => setRsid(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <input placeholder="Genótipo (ex: C/T)" value={genotype} onChange={(e) => setGenotype(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <button type="submit" disabled={consultando} style={{ height: 42 }}>
          {consultando ? "Analisando..." : "Analisar"}
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}

      {resultado && (
        <div style={{ marginBottom: 20 }}>
          <Secao titulo="IDENTIFICAÇÃO">
            <Campo label="rsID" valor={resultado.input.rsid} />
            <Campo label="Genótipo informado" valor={resultado.input.genotype} />
            <Campo label="Zigosidade" valor={resultado.genotype_normalized?.zigosidade} />
            <Campo label="REF / ALT" valor={resultado.genotype_normalized?.ref && `${resultado.genotype_normalized.ref} / ${resultado.genotype_normalized.alt}`} />
            {resultado.genotype_normalized?.observacao && (
              <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "var(--cor-erro)" }}>⚠️ {resultado.genotype_normalized.observacao}</p>
            )}
            <Campo label="Gene" valor={resultado.variant?.gene} />
            <Campo label="Cromossomo" valor={resultado.variant?.chromosome} />
            <Campo label="Posição" valor={resultado.variant?.position} />
          </Secao>

          <Secao titulo="ASSOCIAÇÕES GWAS">
            <SecaoGWAS gwas={resultado.gwas} />
          </Secao>

          <Secao titulo="ANOTAÇÃO FUNCIONAL">
            <Campo label="Consequência funcional" valor={resultado.variant?.consequencia_funcional} />
            <Campo label="CADD score" valor={resultado.variant?.cadd_score} />
            <Campo label="SIFT" valor={resultado.variant?.sift} />
            <Campo label="PolyPhen" valor={resultado.variant?.polyphen} />
          </Secao>

          <Secao titulo="FREQUÊNCIA POPULACIONAL">
            <SecaoFrequencias frequencias={resultado.variant?.frequencias_populacionais} />
          </Secao>

          <Secao titulo="GENE">
            <Campo label="Nome" valor={resultado.gene?.name} />
            <Campo label="Descrição/função" valor={resultado.gene?.summary} />
            <Campo label="Entrez ID" valor={resultado.gene?.entrez_id} />
            <Campo label="Ensembl Gene ID" valor={resultado.gene?.ensembl_gene_id} />
            <p style={{ margin: "8px 0 4px", fontSize: "0.85rem", fontWeight: "bold" }}>Vias biológicas (pathways):</p>
            <SecaoPathways pathways={resultado.gene?.pathways} />
          </Secao>

          <Secao titulo="CLINVAR">
            <SecaoClinVar clinvar={resultado.clinical} />
          </Secao>

          <Secao titulo="FONTES">
            {resultado.sources?.myvariant && (
              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
                <a href={resultado.sources.myvariant} target="_blank" rel="noreferrer">MyVariant.info →</a>
              </p>
            )}
            {resultado.sources?.mygene && (
              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
                <a href={resultado.sources.mygene} target="_blank" rel="noreferrer">MyGene.info →</a>
              </p>
            )}
            {resultado.sources?.clinvar && (
              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
                <a href={resultado.sources.clinvar} target="_blank" rel="noreferrer">ClinVar/NCBI →</a>
              </p>
            )}
            {resultado.sources?.gwas && (
              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
                <a href={resultado.sources.gwas} target="_blank" rel="noreferrer">GWAS Catalog →</a>
              </p>
            )}
          </Secao>
        </div>
      )}

      <h3 style={{ fontSize: "0.95rem" }}>Histórico de consultas deste paciente</h3>
      {historico.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhuma consulta ainda.</p>}
      <table>
        <thead>
          <tr>
            <th>rsID</th>
            <th>Genótipo</th>
            <th>Gene</th>
            <th>Significância clínica</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {historico.map((h) => (
            <tr key={h.id}>
              <td>{h.rsid}</td>
              <td>{h.genotipo_informado}</td>
              <td>{h.gene_symbol ?? "—"}</td>
              <td>{h.significancia_clinica ?? "—"}</td>
              <td>{new Date(h.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
