"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ND = "Não disponível nas bases consultadas.";

function Campo({ label, valor }: { label: string; valor: any }) {
  const texto =
    valor === null || valor === undefined || valor === ""
      ? ND
      : typeof valor === "object"
      ? JSON.stringify(valor)
      : String(valor);
  return (
    <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
      <b>{label}:</b> {texto}
    </p>
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

  const clinvarLista = Array.isArray(resultado?.clinical) ? resultado.clinical : null;

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>🧬 Consulta genética</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
        Consulta determinística, sem uso de IA — dados vêm direto do MyVariant.info, MyGene.info e ClinVar/NCBI.
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 12, background: "var(--cor-fundo-card)" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 6px", color: "var(--cor-marca)" }}>IDENTIFICAÇÃO</p>
            <Campo label="rsID" valor={resultado.input.rsid} />
            <Campo label="Genótipo informado" valor={resultado.input.genotype} />
            <Campo label="Zigosidade" valor={resultado.genotype_normalized?.zigosidade} />
            <Campo label="REF / ALT" valor={resultado.genotype_normalized?.ref && `${resultado.genotype_normalized.ref} / ${resultado.genotype_normalized.alt}`} />
            {resultado.genotype_normalized?.observacao && (
              <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "var(--cor-erro)" }}>
                ⚠️ {resultado.genotype_normalized.observacao}
              </p>
            )}
            <Campo label="Gene" valor={resultado.variant?.gene} />
            <Campo label="Cromossomo" valor={resultado.variant?.chromosome} />
            <Campo label="Posição" valor={resultado.variant?.position} />
          </div>

          <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 12, background: "var(--cor-fundo-card)" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 6px", color: "var(--cor-marca)" }}>VARIANTE</p>
            <Campo label="Consequência funcional" valor={resultado.variant?.consequencia_funcional} />
            <Campo label="CADD score" valor={resultado.variant?.cadd_score} />
            <Campo label="SIFT" valor={resultado.variant?.sift} />
            <Campo label="PolyPhen" valor={resultado.variant?.polyphen} />
            <Campo label="Frequência populacional" valor={resultado.variant?.frequencias_populacionais} />
          </div>

          <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 12, background: "var(--cor-fundo-card)" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 6px", color: "var(--cor-marca)" }}>GENE</p>
            <Campo label="Nome" valor={resultado.gene?.name} />
            <Campo label="Descrição/função" valor={resultado.gene?.summary} />
            <Campo label="Entrez ID" valor={resultado.gene?.entrez_id} />
            <Campo label="Ensembl" valor={resultado.gene?.ensembl} />
            <Campo label="Vias biológicas (pathways)" valor={resultado.gene?.pathways} />
          </div>

          <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 12, background: "var(--cor-fundo-card)" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 6px", color: "var(--cor-marca)" }}>CLINVAR</p>
            {clinvarLista && clinvarLista.length > 0 ? (
              clinvarLista.map((c: any, i: number) => (
                <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < clinvarLista.length - 1 ? "1px solid var(--cor-borda)" : "none" }}>
                  <Campo label="Significância clínica" valor={c.significancia_clinica} />
                  <Campo label="Condições associadas" valor={c.condicoes?.join(", ")} />
                  <Campo label="Review status" valor={c.review_status} />
                  <Campo label="Accession" valor={c.accession} />
                  <Campo label="Última atualização" valor={c.ultima_atualizacao} />
                </div>
              ))
            ) : (
              <p style={{ fontSize: "0.9rem", color: "var(--cor-texto-fraco)" }}>{ND}</p>
            )}
          </div>

          <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 12, background: "var(--cor-fundo-card)" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 6px", color: "var(--cor-marca)" }}>FONTES</p>
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
          </div>
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
