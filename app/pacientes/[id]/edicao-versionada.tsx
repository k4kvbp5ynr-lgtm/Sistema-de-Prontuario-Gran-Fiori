"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Evolucao = {
  id: string;
  motivo_consulta: string | null;
  anamnese: string | null;
  diagnostico_cid: string | null;
  conduta: string | null;
  versao_atual: number;
  ultima_alteracao_em: string | null;
};

export default function EdicaoVersionada({ evolucao }: { evolucao: Evolucao }) {
  const router = useRouter();
  const supabase = createClient();

  const [editando, setEditando] = useState(false);
  const [vendoHistorico, setVendoHistorico] = useState(false);
  const [versoes, setVersoes] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [motivo, setMotivo] = useState(evolucao.motivo_consulta ?? "");
  const [anamnese, setAnamnese] = useState(evolucao.anamnese ?? "");
  const [cid, setCid] = useState(evolucao.diagnostico_cid ?? "");
  const [conduta, setConduta] = useState(evolucao.conduta ?? "");
  const [motivoAlteracao, setMotivoAlteracao] = useState("");

  async function carregarHistorico() {
    const { data } = await supabase
      .from("evolucoes_versoes")
      .select("versao, motivo_consulta, anamnese, diagnostico_cid, conduta, alterado_em, motivo_alteracao, usuarios:alterado_por(nome)")
      .eq("evolucao_id", evolucao.id)
      .order("versao", { ascending: false });
    setVersoes(data ?? []);
    setVendoHistorico(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!motivoAlteracao.trim()) {
      setErro("Informe o motivo da alteração — é exigência de prontuário.");
      return;
    }
    setErro(null);
    setSalvando(true);

    const resposta = await fetch("/api/evolucoes/alterar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evolucaoId: evolucao.id,
        motivoAlteracao,
        campos: { motivo_consulta: motivo, anamnese, diagnostico_cid: cid, conduta },
      }),
    });

    const dados = await resposta.json();
    setSalvando(false);

    if (!resposta.ok) {
      setErro(dados.erro ?? "Erro ao salvar.");
      return;
    }

    setEditando(false);
    setMotivoAlteracao("");
    router.refresh();
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {evolucao.versao_atual > 1 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 9px",
              borderRadius: 10,
              background: "var(--cor-status-abaixo-fundo)",
              color: "var(--cor-status-abaixo-texto)",
            }}
          >
            Versão {evolucao.versao_atual} — alterada
          </span>
        )}
        <button type="button" onClick={() => setEditando(!editando)} className="botao-secundario" style={{ fontSize: 11, padding: "3px 10px" }}>
          {editando ? "Cancelar edição" : "Retificar"}
        </button>
        {evolucao.versao_atual > 1 && (
          <button
            type="button"
            onClick={() => (vendoHistorico ? setVendoHistorico(false) : carregarHistorico())}
            className="botao-secundario"
            style={{ fontSize: 11, padding: "3px 10px" }}
          >
            {vendoHistorico ? "Fechar histórico" : "Ver versões anteriores"}
          </button>
        )}
      </div>

      {editando && (
        <form onSubmit={salvar} style={{ marginTop: 12, padding: 12, border: "1px solid var(--cor-borda)", borderRadius: 10 }}>
          <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", margin: "0 0 10px" }}>
            O registro original não é apagado — fica guardado como versão anterior, com seu nome e a data.
          </p>
          {erro && <p className="erro">{erro}</p>}

          <label style={{ fontSize: 11 }}>Motivo da consulta</label>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />

          <label style={{ fontSize: 11 }}>Anamnese / Exame físico / Observações</label>
          <textarea value={anamnese} onChange={(e) => setAnamnese(e.target.value)} rows={5} style={{ width: "100%", padding: 8 }} />

          <label style={{ fontSize: 11 }}>Diagnóstico / CID</label>
          <input value={cid} onChange={(e) => setCid(e.target.value)} />

          <label style={{ fontSize: 11 }}>Conduta</label>
          <textarea value={conduta} onChange={(e) => setConduta(e.target.value)} rows={3} style={{ width: "100%", padding: 8 }} />

          <label style={{ fontSize: 11, color: "var(--cor-status-abaixo-texto)" }}>Motivo da retificação (obrigatório)</label>
          <input
            value={motivoAlteracao}
            onChange={(e) => setMotivoAlteracao(e.target.value)}
            placeholder="Ex: correção de lateralidade; complemento de exame físico"
          />

          <button type="submit" disabled={salvando} style={{ fontSize: 12 }}>
            {salvando ? "Salvando..." : "Salvar retificação"}
          </button>
        </form>
      )}

      {vendoHistorico && versoes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {versoes.map((v: any) => (
            <div
              key={v.versao}
              style={{
                border: "1px solid var(--cor-borda)",
                borderLeft: "3px solid var(--cor-texto-muito-fraco)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--cor-texto-fraco)" }}>
                Versão {v.versao} · alterada por {v.usuarios?.nome ?? "—"} em{" "}
                {new Date(v.alterado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </p>
              <p style={{ margin: "0 0 8px", fontStyle: "italic", color: "var(--cor-status-abaixo-texto)" }}>
                Motivo: {v.motivo_alteracao ?? "—"}
              </p>
              {v.motivo_consulta && <p style={{ margin: "3px 0" }}><b>Motivo:</b> {v.motivo_consulta}</p>}
              {v.anamnese && <p style={{ margin: "3px 0" }}><b>Anamnese:</b> {v.anamnese}</p>}
              {v.diagnostico_cid && <p style={{ margin: "3px 0" }}><b>Diagnóstico:</b> {v.diagnostico_cid}</p>}
              {v.conduta && <p style={{ margin: "3px 0" }}><b>Conduta:</b> {v.conduta}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
