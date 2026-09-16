"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { QUESTIONARIOS } from "./questionarios-escalas";

type Escala = {
  id: string;
  nome: string;
  sigla: string;
  descricao: string | null;
  pontuacao_minima: number;
  pontuacao_maxima: number;
  maior_e_melhor: boolean;
};

type Resposta = {
  id: string;
  escala_id: string;
  pontuacao: number;
  momento: string | null;
  data_aplicacao: string;
  observacao: string | null;
  respostas: Record<string, number> | null;
};

const MOMENTOS = ["baseline", "1 mes", "3 meses", "6 meses", "12 meses", "avulso"];

export default function EscalasDesfecho({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [escalaAbertaId, setEscalaAbertaId] = useState<string | null>(null);
  const [respostasForm, setRespostasForm] = useState<Record<string, number>>({});
  const [momento, setMomento] = useState("baseline");
  const [dataAplicacao, setDataAplicacao] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [escalaExpandidaHistorico, setEscalaExpandidaHistorico] = useState<string | null>(null);

  async function carregar() {
    const { data: e } = await supabase.from("escalas_desfecho").select("*").eq("ativo", true).order("nome");
    setEscalas(e ?? []);
    const { data: r } = await supabase
      .from("respostas_escala")
      .select("id, escala_id, pontuacao, momento, data_aplicacao, observacao, respostas")
      .eq("paciente_id", pacienteId)
      .order("data_aplicacao", { ascending: true });
    setRespostas(r ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  const escalaAberta = escalas.find((e) => e.id === escalaAbertaId);
  const questionario = escalaAberta ? QUESTIONARIOS[escalaAberta.sigla] : null;

  function abrirEscala(escala: Escala) {
    setEscalaAbertaId(escala.id);
    setRespostasForm({});
    setObservacao("");
    setErro(null);
  }

  function escolher(itemId: string, valor: number) {
    setRespostasForm((atual) => ({ ...atual, [itemId]: valor }));
  }

  const totalItens = questionario?.itens.length ?? 0;
  const respondidos = Object.keys(respostasForm).length;
  const completo = totalItens > 0 && respondidos === totalItens;
  const pontuacaoCalculada = questionario && completo ? questionario.calcular(respostasForm) : null;

  async function salvar() {
    if (!escalaAberta || !questionario || pontuacaoCalculada === null) return;
    setErro(null);
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("respostas_escala").insert({
      paciente_id: pacienteId,
      escala_id: escalaAberta.id,
      pontuacao: pontuacaoCalculada,
      respostas: respostasForm,
      momento,
      data_aplicacao: dataAplicacao,
      observacao: observacao || null,
      registrado_por: user?.id,
    });

    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setEscalaAbertaId(null);
    setRespostasForm({});
    carregar();
  }

  const escalasComRespostas = escalas
    .map((esc) => ({ escala: esc, respostas: respostas.filter((r) => r.escala_id === esc.id) }))
    .filter((g) => g.respostas.length > 0);

  // ---------- Tela do questionário aberto ----------
  if (escalaAberta && questionario) {
    // agrupa por seção, se houver
    const secoes = Array.from(new Set(questionario.itens.map((i) => i.secao ?? "")));

    return (
      <div>
        <button type="button" onClick={() => setEscalaAbertaId(null)} className="botao-secundario" style={{ fontSize: 12, marginBottom: 12 }}>
          ← Voltar para escalas
        </button>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 2px" }}>
          {escalaAberta.sigla} — {escalaAberta.nome}
        </h2>
        {escalaAberta.descricao && <p style={{ fontSize: 12, color: "var(--cor-texto-fraco)", margin: "0 0 14px" }}>{escalaAberta.descricao}</p>}

        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "var(--cor-fundo)",
            padding: "8px 0",
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--cor-borda)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>
            {respondidos} de {totalItens} respondidas
          </span>
          {completo && (
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--fonte-mono)" }}>
              Pontuação: {pontuacaoCalculada}
              {escalaAberta.sigla === "ODI" ? "%" : ` / ${escalaAberta.pontuacao_maxima}`}
            </span>
          )}
        </div>

        {secoes.map((secao) => (
          <div key={secao} style={{ marginBottom: 16 }}>
            {secao && (
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)", margin: "0 0 8px" }}>
                {secao}
              </p>
            )}
            {questionario.itens
              .filter((i) => (i.secao ?? "") === secao)
              .map((item) => (
                <div key={item.id} style={{ border: "1px solid var(--cor-borda)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>{item.texto}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {item.opcoes.map((op) => {
                      const selecionado = respostasForm[item.id] === op.valor;
                      return (
                        <button
                          key={op.label}
                          type="button"
                          onClick={() => escolher(item.id, op.valor)}
                          style={{
                            fontSize: 12,
                            padding: "7px 12px",
                            borderRadius: 20,
                            background: selecionado ? "var(--cor-marca-fundo)" : "transparent",
                            border: selecionado ? "1px solid var(--cor-marca)" : "1px solid var(--cor-borda-input)",
                            color: selecionado ? "var(--cor-marca-clara)" : "var(--cor-texto-suave)",
                            fontWeight: selecionado ? 700 : 500,
                          }}
                        >
                          {op.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        ))}

        <div style={{ border: "1px solid var(--cor-borda)", borderRadius: 10, padding: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11 }}>Momento</label>
              <select value={momento} onChange={(e) => setMomento(e.target.value)}>
                {MOMENTOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Data</label>
              <input type="date" value={dataAplicacao} onChange={(e) => setDataAplicacao(e.target.value)} />
            </div>
          </div>
          <input placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          {erro && <p className="erro">{erro}</p>}
          {!completo && (
            <p style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>
              Responda todos os {totalItens} itens para calcular a pontuação final.
            </p>
          )}
          <button type="button" onClick={salvar} disabled={!completo || salvando} style={{ fontSize: 12 }}>
            {salvando ? "Salvando..." : "Salvar aplicação"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Tela de listagem ----------
  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Escalas de desfecho</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
        Escolha uma escala para preenchê-la — a pontuação final é sempre calculada pelo sistema.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {escalas.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => abrirEscala(e)}
            className="botao-secundario"
            style={{ fontSize: 13, padding: "10px 16px" }}
            disabled={!QUESTIONARIOS[e.sigla]}
            title={!QUESTIONARIOS[e.sigla] ? "Questionário ainda não configurado" : undefined}
          >
            {e.sigla}
          </button>
        ))}
      </div>

      {escalasComRespostas.length === 0 && (
        <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhuma escala aplicada ainda para este paciente.</p>
      )}

      {escalasComRespostas.map(({ escala, respostas: rs }) => {
        const expandida = escalaExpandidaHistorico === escala.id;
        const primeira = rs[0];
        const ultima = rs[rs.length - 1];
        const melhorou = escala.maior_e_melhor ? ultima.pontuacao > primeira.pontuacao : ultima.pontuacao < primeira.pontuacao;
        const mudou = ultima.pontuacao !== primeira.pontuacao;

        return (
          <div key={escala.id} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setEscalaExpandidaHistorico(expandida ? null : escala.id)}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                  {escala.sigla} — {escala.nome}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--cor-texto-fraco)" }}>
                  {rs.length} aplicação{rs.length > 1 ? "ões" : ""} · última: {ultima.pontuacao} em{" "}
                  {new Date(ultima.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR")}
                  {rs.length > 1 && mudou && (
                    <span style={{ color: melhorou ? "var(--cor-sucesso)" : "var(--cor-erro)", fontWeight: 600 }}>
                      {" "}
                      · {melhorou ? "melhora" : "piora"} desde a primeira aplicação
                    </span>
                  )}
                </p>
              </div>
              <span style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>{expandida ? "▾" : "▸"}</span>
            </div>

            {expandida && (
              <div style={{ marginTop: 14 }}>
                {rs.length > 1 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={rs.map((r) => ({ data: r.data_aplicacao, valor: r.pontuacao }))}>
                      <XAxis dataKey="data" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} fontSize={11} />
                      <YAxis fontSize={11} domain={[escala.pontuacao_minima, escala.pontuacao_maxima]} />
                      <Tooltip labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} formatter={(v: any) => [v, "Pontuação"]} />
                      <Line type="monotone" dataKey="valor" stroke="#3d9a91" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Momento</th>
                      <th>Pontuação</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rs].reverse().map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                        <td>{r.momento ?? "—"}</td>
                        <td style={{ fontFamily: "var(--fonte-mono)", fontWeight: 700 }}>{r.pontuacao}</td>
                        <td>{r.observacao ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
