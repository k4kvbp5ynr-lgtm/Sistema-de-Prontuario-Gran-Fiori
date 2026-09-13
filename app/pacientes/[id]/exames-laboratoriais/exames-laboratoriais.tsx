"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Marcador = {
  id: string;
  nome: string;
  categoria: string | null;
  significado: string | null;
  min_mulheres: number | null;
  max_mulheres: number | null;
  min_homens: number | null;
  max_homens: number | null;
  interpretacao_acima: string | null;
  interpretacao_dentro: string | null;
  interpretacao_abaixo: string | null;
  conduta_abaixo: string | null;
  conduta_dentro: string | null;
  conduta_acima: string | null;
};

type Resultado = {
  id: string;
  marcador_id: string;
  valor: number;
  data_exame: string;
  status: string | null;
};

const CORES_STATUS: Record<string, string> = {
  abaixo: "#b3261e",
  dentro: "#4a7a4a",
  acima: "#b3261e",
};

export default function ExamesLaboratoriais({ pacienteId, sexoPaciente }: { pacienteId: string; sexoPaciente: string | null }) {
  const supabase = createClient();
  const [marcadores, setMarcadores] = useState<Marcador[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [marcadorExpandido, setMarcadorExpandido] = useState<string | null>(null);

  const [buscaMarcador, setBuscaMarcador] = useState("");
  const [marcadorSelecionado, setMarcadorSelecionado] = useState<Marcador | null>(null);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [valor, setValor] = useState("");
  const [dataExame, setDataExame] = useState(new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data: mData } = await supabase
      .from("marcadores_exames")
      .select(
        "id, nome, categoria, significado, min_mulheres, max_mulheres, min_homens, max_homens, interpretacao_acima, interpretacao_dentro, interpretacao_abaixo, conduta_abaixo, conduta_dentro, conduta_acima"
      )
      .eq("ativo", true)
      .order("nome");
    setMarcadores(mData ?? []);

    const { data: rData } = await supabase
      .from("resultados_exames_paciente")
      .select("id, marcador_id, valor, data_exame, status")
      .eq("paciente_id", pacienteId)
      .order("data_exame", { ascending: true });
    setResultados(rData ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function calcularStatus(m: Marcador, v: number): string {
    const min = sexoPaciente === "masculino" ? m.min_homens : m.min_mulheres;
    const max = sexoPaciente === "masculino" ? m.max_homens : m.max_mulheres;
    if (min != null && v < min) return "abaixo";
    if (max != null && v > max) return "acima";
    return "dentro";
  }

  async function salvarResultado(e: React.FormEvent) {
    e.preventDefault();
    if (!marcadorSelecionado || !valor) return;
    setErro(null);
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErro("Sessão expirada.");
      setSalvando(false);
      return;
    }

    const valorNum = parseFloat(valor.replace(",", "."));
    const status = calcularStatus(marcadorSelecionado, valorNum);

    const { error } = await supabase.from("resultados_exames_paciente").insert({
      paciente_id: pacienteId,
      marcador_id: marcadorSelecionado.id,
      valor: valorNum,
      data_exame: dataExame,
      status,
      registrado_por: user.id,
    });

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setMarcadorSelecionado(null);
    setBuscaMarcador("");
    setValor("");
    carregar();
  }

  const ultimoPorMarcador = new Map<string, Resultado>();
  for (const r of resultados) {
    const atual = ultimoPorMarcador.get(r.marcador_id);
    if (!atual || r.data_exame >= atual.data_exame) ultimoPorMarcador.set(r.marcador_id, r);
  }

  const marcadoresComResultado = marcadores.filter((m) => ultimoPorMarcador.has(m.id));
  const categorias = Array.from(new Set(marcadoresComResultado.map((m) => m.categoria || "Outros")));

  const marcadoresFiltrados = buscaMarcador.trim()
    ? marcadores.filter((m) => m.nome.toLowerCase().includes(buscaMarcador.toLowerCase())).slice(0, 10)
    : [];

  return (
    <div
      style={{
        border: "1px solid #e5e0d8",
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        background: "#fbfaf7",
      }}
    >
      <p style={{ fontWeight: "bold", margin: "0 0 8px" }}>Exames laboratoriais (análises clínicas)</p>

      <form onSubmit={salvarResultado} style={{ marginBottom: 16 }}>
        {erro && <p className="erro">{erro}</p>}

        <div style={{ position: "relative", marginBottom: 8 }}>
          <input
            placeholder="Buscar marcador (ex: Hemoglobina, TSH, Ferritina...)"
            value={marcadorSelecionado ? marcadorSelecionado.nome : buscaMarcador}
            onChange={(e) => {
              setBuscaMarcador(e.target.value);
              setMarcadorSelecionado(null);
              setMostrarLista(true);
            }}
            onFocus={() => setMostrarLista(true)}
          />
          {mostrarLista && marcadoresFiltrados.length > 0 && (
            <ul
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid #e5e0d8",
                borderRadius: 6,
                listStyle: "none",
                margin: 0,
                padding: 4,
                maxHeight: 220,
                overflowY: "auto",
                zIndex: 20,
              }}
            >
              {marcadoresFiltrados.map((m) => (
                <li
                  key={m.id}
                  onClick={() => {
                    setMarcadorSelecionado(m);
                    setBuscaMarcador(m.nome);
                    setMostrarLista(false);
                  }}
                  style={{ padding: "8px 10px", cursor: "pointer", fontSize: "0.9rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fbfaf7")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {m.nome} <span style={{ color: "#999", fontSize: "0.8rem" }}>({m.categoria})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} style={{ flex: 1 }} />
          <input type="date" value={dataExame} onChange={(e) => setDataExame(e.target.value)} style={{ flex: 1 }} />
        </div>

        <button type="submit" disabled={!marcadorSelecionado || !valor || salvando} style={{ marginTop: 8 }}>
          {salvando ? "Salvando..." : "Lançar resultado"}
        </button>
      </form>

      {categorias.length === 0 && <p style={{ fontSize: "0.9rem", color: "#888" }}>Nenhum resultado lançado ainda.</p>}

      {categorias.map((cat) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <p style={{ fontWeight: "bold", fontSize: "0.85rem", color: "#7a5a2f", margin: "8px 0 4px" }}>{cat}</p>
          <table>
            <thead>
              <tr>
                <th>Marcador</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {marcadoresComResultado
                .filter((m) => (m.categoria || "Outros") === cat)
                .map((m) => {
                  const ultimo = ultimoPorMarcador.get(m.id)!;
                  const historico = resultados
                    .filter((r) => r.marcador_id === m.id)
                    .map((r) => ({ data: r.data_exame, valor: r.valor }));
                  const expandido = marcadorExpandido === m.id;
                  return (
                    <React.Fragment key={m.id}>
                      <tr>
                        <td>{m.nome}</td>
                        <td>{ultimo.valor}</td>
                        <td>{new Date(ultimo.data_exame + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                        <td style={{ color: CORES_STATUS[ultimo.status ?? "dentro"], fontWeight: "bold" }}>
                          {ultimo.status ?? "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setMarcadorExpandido(expandido ? null : m.id)}
                            style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                          >
                            {expandido ? "Fechar" : "Ver evolução"}
                          </button>
                        </td>
                      </tr>
                      {expandido && (
                        <tr>
                          <td colSpan={5} style={{ background: "white", padding: 12 }}>
                            {historico.length > 1 ? (
                              <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={historico}>
                                  <XAxis dataKey="data" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} fontSize={11} />
                                  <YAxis fontSize={11} domain={["auto", "auto"]} />
                                  <Tooltip labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} />
                                  <Line type="monotone" dataKey="valor" stroke="#7a5a2f" strokeWidth={2} dot />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <p style={{ fontSize: "0.85rem", color: "#888" }}>
                                Só há um resultado lançado ainda — a evolução aparece a partir do segundo.
                              </p>
                            )}
                            <div style={{ fontSize: "0.85rem", marginTop: 8 }}>
                              <p style={{ margin: "4px 0" }}>
                                <b>Significado:</b> {m.significado}
                              </p>
                              <p style={{ margin: "4px 0" }}>
                                <b>Interpretação ({ultimo.status}):</b>{" "}
                                {ultimo.status === "acima"
                                  ? m.interpretacao_acima
                                  : ultimo.status === "abaixo"
                                  ? m.interpretacao_abaixo
                                  : m.interpretacao_dentro}
                              </p>
                              <p style={{ margin: "4px 0" }}>
                                <b>Conduta sugerida:</b>{" "}
                                {ultimo.status === "acima"
                                  ? m.conduta_acima
                                  : ultimo.status === "abaixo"
                                  ? m.conduta_abaixo
                                  : m.conduta_dentro}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
