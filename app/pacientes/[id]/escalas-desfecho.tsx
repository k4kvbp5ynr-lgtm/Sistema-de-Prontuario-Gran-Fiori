"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Escala = {
  id: string;
  nome: string;
  sigla: string;
  descricao: string | null;
  regiao: string | null;
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
};

const MOMENTOS = ["baseline", "1 mes", "3 meses", "6 meses", "12 meses", "avulso"];

export default function EscalasDesfecho({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [escalaSelecionada, setEscalaSelecionada] = useState<string>("");
  const [pontuacao, setPontuacao] = useState("");
  const [momento, setMomento] = useState("baseline");
  const [dataAplicacao, setDataAplicacao] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [escalaExpandida, setEscalaExpandida] = useState<string | null>(null);

  async function carregar() {
    const { data: e } = await supabase.from("escalas_desfecho").select("*").eq("ativo", true).order("nome");
    setEscalas(e ?? []);
    const { data: r } = await supabase
      .from("respostas_escala")
      .select("id, escala_id, pontuacao, momento, data_aplicacao, observacao")
      .eq("paciente_id", pacienteId)
      .order("data_aplicacao", { ascending: true });
    setRespostas(r ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  const escalaAtual = escalas.find((e) => e.id === escalaSelecionada);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!escalaSelecionada || pontuacao === "") return;

    const valor = parseFloat(pontuacao.replace(",", "."));
    if (escalaAtual && (valor < escalaAtual.pontuacao_minima || valor > escalaAtual.pontuacao_maxima)) {
      setErro(`Pontuação deve estar entre ${escalaAtual.pontuacao_minima} e ${escalaAtual.pontuacao_maxima} para ${escalaAtual.sigla}.`);
      return;
    }

    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("respostas_escala").insert({
      paciente_id: pacienteId,
      escala_id: escalaSelecionada,
      pontuacao: valor,
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

    setPontuacao("");
    setObservacao("");
    carregar();
  }

  const escalasComRespostas = escalas
    .map((esc) => ({ escala: esc, respostas: respostas.filter((r) => r.escala_id === esc.id) }))
    .filter((g) => g.respostas.length > 0);

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Escalas de desfecho</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
        Aplique escalas validadas e acompanhe a evolução do paciente ao longo do tempo.
      </p>

      <form onSubmit={salvar} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11 }}>Escala</label>
            <select value={escalaSelecionada} onChange={(e) => setEscalaSelecionada(e.target.value)}>
              <option value="">Selecione</option>
              {escalas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.sigla} — {e.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11 }}>
              Pontuação {escalaAtual && `(${escalaAtual.pontuacao_minima}–${escalaAtual.pontuacao_maxima})`}
            </label>
            <input value={pontuacao} onChange={(e) => setPontuacao(e.target.value)} placeholder="Ex: 6" />
          </div>
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
        {escalaAtual?.descricao && (
          <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", margin: "0 0 8px" }}>
            {escalaAtual.descricao} {escalaAtual.maior_e_melhor ? "Pontuação maior = melhor." : "Pontuação maior = pior."}
          </p>
        )}
        <input placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={salvando || !escalaSelecionada || pontuacao === ""} style={{ fontSize: 12 }}>
          {salvando ? "Salvando..." : "Registrar aplicação"}
        </button>
      </form>

      {escalasComRespostas.length === 0 && (
        <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhuma escala aplicada ainda para este paciente.</p>
      )}

      {escalasComRespostas.map(({ escala, respostas: rs }) => {
        const expandida = escalaExpandida === escala.id;
        const primeira = rs[0];
        const ultima = rs[rs.length - 1];
        const melhorou = escala.maior_e_melhor ? ultima.pontuacao > primeira.pontuacao : ultima.pontuacao < primeira.pontuacao;
        const mudou = ultima.pontuacao !== primeira.pontuacao;

        return (
          <div key={escala.id} style={{ border: "1px solid var(--cor-borda)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setEscalaExpandida(expandida ? null : escala.id)}
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
                    <LineChart data={rs.map((r) => ({ data: r.data_aplicacao, valor: r.pontuacao, momento: r.momento }))}>
                      <XAxis dataKey="data" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} fontSize={11} />
                      <YAxis fontSize={11} domain={[escala.pontuacao_minima, escala.pontuacao_maxima]} />
                      <Tooltip
                        labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}
                        formatter={(valor: any) => [valor, "Pontuação"]}
                      />
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
