"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Marcador = {
  id: string;
  nome: string;
  categoria: string | null;
  significado: string | null;
  valor_ideal_mulheres_texto: string | null;
  valor_ideal_homens_texto: string | null;
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
  marcador_id: string | null;
  nome_livre: string | null;
  valor: number;
  data_exame: string;
  status: string | null;
  min_referencia_livre: number | null;
  max_referencia_livre: number | null;
  unidade: string | null;
};

// dentro = verde (normal) · acima = vermelho · abaixo = amarelo
const CORES_STATUS: Record<string, string> = {
  dentro: "#4a7a4a",
  acima: "#b3261e",
  abaixo: "#b8860b",
};
const FUNDO_STATUS: Record<string, string> = {
  dentro: "#e8f2e8",
  acima: "#fbe8e6",
  abaixo: "#faf1d9",
};

export default function ExamesLaboratoriais({ pacienteId, sexoPaciente }: { pacienteId: string; sexoPaciente: string | null }) {
  const supabase = createClient();
  const [marcadores, setMarcadores] = useState<Marcador[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [linhaExpandida, setLinhaExpandida] = useState<string | null>(null);

  const [buscaMarcador, setBuscaMarcador] = useState("");
  const [marcadorSelecionado, setMarcadorSelecionado] = useState<Marcador | null>(null);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [valor, setValor] = useState("");
  const [dataExame, setDataExame] = useState(new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [extraindo, setExtraindo] = useState(false);
  const [erroExtracao, setErroExtracao] = useState<string | null>(null);
  const [itensExtraidos, setItensExtraidos] = useState<any[]>([]);
  const [salvandoExtraidos, setSalvandoExtraidos] = useState(false);

  const [sugestaoLivre, setSugestaoLivre] = useState<Record<string, string>>({});
  const [buscandoSugestaoLivre, setBuscandoSugestaoLivre] = useState<string | null>(null);

  async function carregar() {
    const { data: mData } = await supabase
      .from("marcadores_exames")
      .select(
        "id, nome, categoria, significado, valor_ideal_mulheres_texto, valor_ideal_homens_texto, min_mulheres, max_mulheres, min_homens, max_homens, interpretacao_acima, interpretacao_dentro, interpretacao_abaixo, conduta_abaixo, conduta_dentro, conduta_acima"
      )
      .eq("ativo", true)
      .order("nome");
    setMarcadores(mData ?? []);

    const { data: rData } = await supabase
      .from("resultados_exames_paciente")
      .select("id, marcador_id, nome_livre, valor, data_exame, status, min_referencia_livre, max_referencia_livre, unidade")
      .eq("paciente_id", pacienteId)
      .order("data_exame", { ascending: true });
    setResultados(rData ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function calcularStatus(min: number | null, max: number | null, v: number): string | null {
    // Faixa inválida (ex: 0 a 0, ou mínimo maior que o máximo) — trata como referência desconhecida
    if (min != null && max != null && (min > max || (min === 0 && max === 0))) {
      return null;
    }
    if (min != null && v < min) return "abaixo";
    if (max != null && v > max) return "acima";
    return "dentro";
  }

  function calcularStatusMarcador(m: Marcador, v: number): string | null {
    const min = sexoPaciente === "masculino" ? m.min_homens : m.min_mulheres;
    const max = sexoPaciente === "masculino" ? m.max_homens : m.max_mulheres;
    return calcularStatus(min, max, v);
  }

  async function salvarOuAtualizarResultado(dados: {
    marcador_id: string | null;
    nome_livre: string | null;
    valor: number;
    data_exame: string;
    status: string | null;
    registrado_por: string;
    extraido_por_ia?: boolean;
    unidade?: string | null;
    min_referencia_livre?: number | null;
    max_referencia_livre?: number | null;
  }) {
    let query = supabase
      .from("resultados_exames_paciente")
      .select("id")
      .eq("paciente_id", pacienteId)
      .eq("data_exame", dados.data_exame);

    query = dados.marcador_id ? query.eq("marcador_id", dados.marcador_id) : query.is("marcador_id", null).eq("nome_livre", dados.nome_livre);

    const { data: existente } = await query.maybeSingle();

    if (existente) {
      return supabase.from("resultados_exames_paciente").update(dados).eq("id", existente.id);
    }
    return supabase.from("resultados_exames_paciente").insert({ paciente_id: pacienteId, ...dados });
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
    const status = calcularStatusMarcador(marcadorSelecionado, valorNum);

    const { error } = await salvarOuAtualizarResultado({
      marcador_id: marcadorSelecionado.id,
      nome_livre: null,
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

  async function extrairComIA(arquivo: File) {
    setErroExtracao(null);
    setExtraindo(true);
    setItensExtraidos([]);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const resposta = await fetch("/api/ia/extrair-exames", { method: "POST", body: formData });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErroExtracao(dados.erro ?? "Erro ao extrair exames.");
        setExtraindo(false);
        return;
      }

      const itens = (dados.exames ?? []).map((item: any) => ({
        ...item,
        incluir: true,
        valorFinal: item.valor_convertido ?? item.valor_original,
        dataFinal: item.data_exame || new Date().toISOString().slice(0, 10),
        minRefFinal: item.min_referencia_livre ?? "",
        maxRefFinal: item.max_referencia_livre ?? "",
      }));
      setItensExtraidos(itens);
      if (itens.length === 0) {
        setErroExtracao("A IA não identificou nenhum exame neste PDF. Confira se o arquivo tem texto selecionável (não é uma foto/scan de baixa qualidade) e tente de novo.");
      }
    } catch {
      setErroExtracao("Erro de conexão com a IA.");
    }
    setExtraindo(false);
  }

  function atualizarItemExtraido(index: number, campo: string, valor: any) {
    setItensExtraidos((atual) => atual.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  async function salvarItensExtraidos() {
    setSalvandoExtraidos(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErroExtracao("Sessão expirada.");
      setSalvandoExtraidos(false);
      return;
    }

    const paraSalvar = itensExtraidos.filter((item) => item.incluir && item.valorFinal);

    for (const item of paraSalvar) {
      const valorNum = parseFloat(String(item.valorFinal).replace(",", "."));

      if (item.marcador_id) {
        const marcador = marcadores.find((m) => m.id === item.marcador_id);
        const status = marcador ? calcularStatusMarcador(marcador, valorNum) : null;
        await salvarOuAtualizarResultado({
          marcador_id: item.marcador_id,
          nome_livre: null,
          valor: valorNum,
          data_exame: item.dataFinal,
          status,
          registrado_por: user.id,
          extraido_por_ia: true,
          unidade: item.unidade_original || null,
        });
      } else {
        const minRef = item.minRefFinal !== "" ? parseFloat(String(item.minRefFinal).replace(",", ".")) : null;
        const maxRef = item.maxRefFinal !== "" ? parseFloat(String(item.maxRefFinal).replace(",", ".")) : null;
        const status = calcularStatus(minRef, maxRef, valorNum);
        await salvarOuAtualizarResultado({
          marcador_id: null,
          nome_livre: item.nome_extraido_do_laudo,
          valor: valorNum,
          data_exame: item.dataFinal,
          status,
          registrado_por: user.id,
          extraido_por_ia: true,
          unidade: item.unidade_original || null,
          min_referencia_livre: minRef,
          max_referencia_livre: maxRef,
        });
      }
    }

    setSalvandoExtraidos(false);
    setItensExtraidos([]);
    carregar();
  }

  async function pedirSugestaoLivre(chave: string, nome: string, ultimo: Resultado) {
    setBuscandoSugestaoLivre(chave);
    try {
      const resposta = await fetch("/api/ia/interpretar-exame-livre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeExame: nome,
          valor: ultimo.valor,
          unidade: ultimo.unidade,
          minReferencia: ultimo.min_referencia_livre,
          maxReferencia: ultimo.max_referencia_livre,
          status: ultimo.status,
          sexoPaciente,
        }),
      });
      const dados = await resposta.json();
      if (resposta.ok) {
        setSugestaoLivre((atual) => ({ ...atual, [chave]: dados.sugestao }));
      } else {
        setSugestaoLivre((atual) => ({ ...atual, [chave]: "Erro: " + (dados.erro ?? "não foi possível gerar sugestão.") }));
      }
    } catch {
      setSugestaoLivre((atual) => ({ ...atual, [chave]: "Erro de conexão." }));
    }
    setBuscandoSugestaoLivre(null);
  }

  const marcadoresFiltrados = buscaMarcador.trim()
    ? marcadores.filter((m) => m.nome.toLowerCase().includes(buscaMarcador.toLowerCase())).slice(0, 10)
    : [];

  // Monta as linhas (marcadores da base + exames "livres" fora da base) e as colunas (datas distintas)
  type Linha = { chave: string; label: string; categoria: string; marcador: Marcador | null; porData: Map<string, Resultado> };
  const linhasMap = new Map<string, Linha>();

  for (const r of resultados) {
    const chave = r.marcador_id ?? `livre:${r.nome_livre}`;
    if (!linhasMap.has(chave)) {
      const marcador = r.marcador_id ? marcadores.find((m) => m.id === r.marcador_id) ?? null : null;
      linhasMap.set(chave, {
        chave,
        label: marcador?.nome ?? r.nome_livre ?? "—",
        categoria: marcador?.categoria ?? "Não identificados (sem base no sistema)",
        marcador,
        porData: new Map(),
      });
    }
    linhasMap.get(chave)!.porData.set(r.data_exame, r);
  }

  const linhas = Array.from(linhasMap.values());
  const categorias = Array.from(new Set(linhas.map((l) => l.categoria)));
  const datas = Array.from(new Set(resultados.map((r) => r.data_exame))).sort();

  return (
    <div
      id="exames-laboratoriais"
      style={{
        borderRadius: 8,
        marginBottom: 20,
        background: "#fbfaf7",
      }}
    >
      <h2 style={{ fontSize: "1.1rem" }}>
        Exames de análises clínicas {resultados.length > 0 && `(${linhas.length} marcadores)`}
      </h2>

      <div style={{ padding: "0 0 16px" }}>
        <div style={{ background: "#f0f4f6", border: "1px solid #4a6a7a", borderRadius: 6, padding: 12, marginBottom: 16 }}>
          <p style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#4a6a7a", margin: "0 0 8px" }}>
            🤖 Extrair resultados de um PDF automaticamente (IA)
          </p>
            <input
              type="file"
              accept=".pdf"
              disabled={extraindo}
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) extrairComIA(arquivo);
              }}
            />
            {extraindo && (
              <p style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                ⏳ Lendo o PDF e identificando os exames... para laudos grandes (muitas páginas/exames) isso pode
                levar até 3-4 minutos. Não feche nem recarregue esta página, só aguarde.
              </p>
            )}
            {erroExtracao && <p className="erro">{erroExtracao}</p>}

            {itensExtraidos.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: "0.85rem", color: "#666" }}>
                  Revise antes de salvar. Itens sem marcador identificado usam a referência impressa no próprio laudo
                  (edite se necessário).
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Extraído do laudo</th>
                      <th>Marcador do sistema</th>
                      <th>Valor</th>
                      <th>Ref. mín/máx (se fora da base)</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensExtraidos.map((item, i) => (
                      <tr key={i}>
                        <td>
                          <input
                            type="checkbox"
                            checked={item.incluir}
                            onChange={(e) => atualizarItemExtraido(i, "incluir", e.target.checked)}
                          />
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>
                          {item.nome_extraido_do_laudo}
                          {item.observacao_conversao && (
                            <>
                              <br />
                              <span style={{ color: "#888" }}>{item.observacao_conversao}</span>
                            </>
                          )}
                        </td>
                        <td>
                          <select
                            value={item.marcador_id ?? ""}
                            onChange={(e) => atualizarItemExtraido(i, "marcador_id", e.target.value || null)}
                            style={{ fontSize: "0.8rem", padding: 4 }}
                          >
                            <option value="">— não identificado —</option>
                            {marcadores.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={item.valorFinal}
                            onChange={(e) => atualizarItemExtraido(i, "valorFinal", e.target.value)}
                            style={{ width: 70, padding: 4, fontSize: "0.8rem" }}
                          />
                        </td>
                        <td>
                          {!item.marcador_id && (
                            <span style={{ display: "flex", gap: 4 }}>
                              <input
                                placeholder="mín"
                                value={item.minRefFinal}
                                onChange={(e) => atualizarItemExtraido(i, "minRefFinal", e.target.value)}
                                style={{ width: 50, padding: 4, fontSize: "0.8rem" }}
                              />
                              <input
                                placeholder="máx"
                                value={item.maxRefFinal}
                                onChange={(e) => atualizarItemExtraido(i, "maxRefFinal", e.target.value)}
                                style={{ width: 50, padding: 4, fontSize: "0.8rem" }}
                              />
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.dataFinal}
                            onChange={(e) => atualizarItemExtraido(i, "dataFinal", e.target.value)}
                            style={{ padding: 4, fontSize: "0.8rem" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <button type="button" onClick={salvarItensExtraidos} disabled={salvandoExtraidos} style={{ marginTop: 8 }}>
                  {salvandoExtraidos ? "Salvando..." : "Salvar resultados selecionados"}
                </button>
              </div>
            )}
          </div>

          <form onSubmit={salvarResultado} style={{ marginBottom: 16 }}>
            {erro && <p className="erro">{erro}</p>}

            <div style={{ position: "relative", marginBottom: 8 }}>
              <input
                placeholder="Lançar manualmente: buscar marcador (ex: Hemoglobina, TSH...)"
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

          <div style={{ display: "flex", gap: 16, fontSize: "0.8rem", marginBottom: 12 }}>
            <span><span style={{ display: "inline-block", width: 12, height: 12, background: CORES_STATUS.dentro, borderRadius: 2 }} /> Normal</span>
            <span><span style={{ display: "inline-block", width: 12, height: 12, background: CORES_STATUS.acima, borderRadius: 2 }} /> Acima do normal</span>
            <span><span style={{ display: "inline-block", width: 12, height: 12, background: CORES_STATUS.abaixo, borderRadius: 2 }} /> Abaixo do normal</span>
          </div>

          {linhas.length === 0 && <p style={{ fontSize: "0.9rem", color: "#888" }}>Nenhum resultado lançado ainda.</p>}

          {categorias.map((cat) => (
            <div key={cat} style={{ marginBottom: 16, overflowX: "auto" }}>
              <p style={{ fontWeight: "bold", fontSize: "0.85rem", color: "#7a5a2f", margin: "8px 0 4px" }}>{cat}</p>
              <table>
                <thead>
                  <tr>
                    <th>Marcador</th>
                    <th>Referência</th>
                    {datas.map((d) => (
                      <th key={d} style={{ whiteSpace: "nowrap" }}>
                        {new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {linhas
                    .filter((l) => l.categoria === cat)
                    .map((linha) => {
                      const expandida = linhaExpandida === linha.chave;
                      const resultadosOrdenados = datas.map((d) => linha.porData.get(d)).filter(Boolean) as Resultado[];
                      const ultimo = resultadosOrdenados[resultadosOrdenados.length - 1];
                      const referenciaTexto = linha.marcador
                        ? (sexoPaciente === "masculino" ? linha.marcador.valor_ideal_homens_texto : linha.marcador.valor_ideal_mulheres_texto) ?? "—"
                        : ultimo
                        ? `${ultimo.min_referencia_livre ?? "—"} a ${ultimo.max_referencia_livre ?? "—"} ${ultimo.unidade ?? ""}`
                        : "—";
                      return (
                        <React.Fragment key={linha.chave}>
                          <tr>
                            <td>{linha.label}</td>
                            <td style={{ fontSize: "0.78rem", color: "#666", whiteSpace: "nowrap" }}>{referenciaTexto}</td>
                            {datas.map((d) => {
                              const r = linha.porData.get(d);
                              return (
                                <td
                                  key={d}
                                  style={{
                                    textAlign: "center",
                                    background: r?.status ? FUNDO_STATUS[r.status] : undefined,
                                    color: r?.status ? CORES_STATUS[r.status] : undefined,
                                    fontWeight: r ? "bold" : "normal",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {r ? `${r.valor}${r.unidade ? " " + r.unidade : ""}` : ""}
                                </td>
                              );
                            })}
                            <td>
                              <button
                                type="button"
                                onClick={() => setLinhaExpandida(expandida ? null : linha.chave)}
                                style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                              >
                                {expandida ? "Fechar" : "Ver interpretação"}
                              </button>
                            </td>
                          </tr>
                          {expandida && ultimo && (
                            <tr>
                              <td colSpan={datas.length + 3} style={{ background: "white", padding: 12 }}>
                                {resultadosOrdenados.length > 1 && (
                                  <ResponsiveContainer width="100%" height={160}>
                                    <LineChart data={resultadosOrdenados.map((r) => ({ data: r.data_exame, valor: r.valor }))}>
                                      <XAxis dataKey="data" tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} fontSize={11} />
                                      <YAxis fontSize={11} domain={["auto", "auto"]} />
                                      <Tooltip labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} />
                                      <Line type="monotone" dataKey="valor" stroke="#7a5a2f" strokeWidth={2} dot />
                                    </LineChart>
                                  </ResponsiveContainer>
                                )}

                                {linha.marcador ? (
                                  <div style={{ fontSize: "0.85rem", marginTop: 8 }}>
                                    <p style={{ margin: "4px 0" }}>
                                      <b>Significado:</b> {linha.marcador.significado}
                                    </p>
                                    <p style={{ margin: "4px 0" }}>
                                      <b>Interpretação ({ultimo.status}):</b>{" "}
                                      {ultimo.status === "acima"
                                        ? linha.marcador.interpretacao_acima
                                        : ultimo.status === "abaixo"
                                        ? linha.marcador.interpretacao_abaixo
                                        : linha.marcador.interpretacao_dentro}
                                    </p>
                                    <p style={{ margin: "4px 0" }}>
                                      <b>Conduta sugerida:</b>{" "}
                                      {ultimo.status === "acima"
                                        ? linha.marcador.conduta_acima
                                        : ultimo.status === "abaixo"
                                        ? linha.marcador.conduta_abaixo
                                        : linha.marcador.conduta_dentro}
                                    </p>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: "0.85rem", marginTop: 8 }}>
                                    <p style={{ margin: "4px 0", color: "#888" }}>
                                      Esse exame não está na base de referência do sistema. Referência do laudo:{" "}
                                      {ultimo.min_referencia_livre ?? "—"} a {ultimo.max_referencia_livre ?? "—"}{" "}
                                      {ultimo.unidade ?? ""}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => pedirSugestaoLivre(linha.chave, linha.label, ultimo)}
                                      disabled={buscandoSugestaoLivre === linha.chave}
                                      style={{ fontSize: "0.8rem", background: "#4a6a7a" }}
                                    >
                                      {buscandoSugestaoLivre === linha.chave ? "Consultando IA..." : "🤖 Pedir sugestão de IA"}
                                    </button>
                                    {sugestaoLivre[linha.chave] && (
                                      <div
                                        style={{
                                          border: "1px solid #4a6a7a",
                                          borderRadius: 6,
                                          padding: 10,
                                          marginTop: 8,
                                          background: "#f0f4f6",
                                          whiteSpace: "pre-wrap",
                                        }}
                                      >
                                        <p style={{ margin: "0 0 6px", fontWeight: "bold", color: "#4a6a7a" }}>
                                          🤖 Sugestão gerada por IA — revise antes de usar.
                                        </p>
                                        {sugestaoLivre[linha.chave]}
                                      </div>
                                    )}
                                  </div>
                                )}
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
    </div>
  );
}
