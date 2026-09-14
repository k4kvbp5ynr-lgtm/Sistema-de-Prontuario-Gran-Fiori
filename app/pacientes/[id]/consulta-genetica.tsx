"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Consulta = {
  id: string;
  rsid: string;
  genotipo: string;
  gene: string | null;
  magnitude: number | null;
  repute: string | null;
  resumo: string | null;
  fonte_url: string | null;
  criado_em: string;
};

export default function ConsultaGenetica({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [historico, setHistorico] = useState<Consulta[]>([]);
  const [rsid, setRsid] = useState("");
  const [genotipo, setGenotipo] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);

  async function carregarHistorico() {
    const { data } = await supabase
      .from("consultas_geneticas")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("criado_em", { ascending: false });
    setHistorico(data ?? []);
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    if (!rsid.trim() || !genotipo.trim()) return;
    setErro(null);
    setConsultando(true);
    setResultado(null);

    try {
      const resposta = await fetch("/api/genetica/consultar-snp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId, rsid: rsid.trim(), genotipo: genotipo.trim() }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Erro ao consultar.");
      } else {
        setResultado(dados);
        if (dados.encontrado) {
          setRsid("");
          setGenotipo("");
          carregarHistorico();
        }
      }
    } catch {
      setErro("Erro de conexão.");
    }
    setConsultando(false);
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>🧬 Consulta genética (SNPedia)</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
        Consulta pública ao SNPedia por variante (rsid) + genótipo. Exige que você já tenha o resultado bruto do
        exame genético do paciente (rsid e genótipo específico) em mãos.
      </p>

      <form onSubmit={consultar} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="rsid (ex: rs7412)" value={rsid} onChange={(e) => setRsid(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <input placeholder="Genótipo (ex: C;C)" value={genotipo} onChange={(e) => setGenotipo(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <button type="submit" disabled={consultando} style={{ height: 42 }}>
          {consultando ? "Consultando..." : "Consultar"}
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}

      {resultado && !resultado.encontrado && (
        <p style={{ fontSize: "0.9rem", color: "var(--cor-texto-fraco)" }}>{resultado.mensagem}</p>
      )}

      {resultado && resultado.encontrado && (
        <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 12, marginBottom: 16, background: "var(--cor-fundo-card)" }}>
          <p style={{ margin: "0 0 4px" }}>
            <b>{resultado.rsid}</b> ({resultado.genotipo}) {resultado.gene && `· gene ${resultado.gene}`}
          </p>
          {resultado.repute && (
            <p style={{ margin: "4px 0", color: resultado.repute === "Bad" ? "var(--cor-erro)" : resultado.repute === "Good" ? "var(--cor-sucesso)" : undefined }}>
              Classificação SNPedia: <b>{resultado.repute}</b>
              {resultado.magnitude && ` · magnitude ${resultado.magnitude}`}
            </p>
          )}
          {resultado.resumo && <p style={{ margin: "4px 0" }}>{resultado.resumo}</p>}
          {resultado.fonte_url && (
            <a href={resultado.fonte_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem" }}>
              Ver página completa no SNPedia →
            </a>
          )}
        </div>
      )}

      <h3 style={{ fontSize: "0.95rem" }}>Histórico de consultas deste paciente</h3>
      {historico.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhuma consulta ainda.</p>}
      <table>
        <thead>
          <tr>
            <th>rsid</th>
            <th>Genótipo</th>
            <th>Gene</th>
            <th>Classificação</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {historico.map((h) => (
            <tr key={h.id}>
              <td>
                {h.fonte_url ? (
                  <a href={h.fonte_url} target="_blank" rel="noreferrer">
                    {h.rsid}
                  </a>
                ) : (
                  h.rsid
                )}
              </td>
              <td>{h.genotipo}</td>
              <td>{h.gene ?? "—"}</td>
              <td>{h.repute ?? "—"}</td>
              <td>{new Date(h.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
