"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useConsultaTimer } from "./consulta-timer-context";

export default function NovaEvolucaoForm({ pacienteId, podeUsarIA = true }: { pacienteId: string; podeUsarIA?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const { pararEObterDuracao } = useConsultaTimer();

  const [tipoAtendimento, setTipoAtendimento] = useState("consulta_medica");
  const [motivo, setMotivo] = useState("");
  const [anamnese, setAnamnese] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [conduta, setConduta] = useState("");
  const [sugestaoIA, setSugestaoIA] = useState<string | null>(null);
  const [buscandoSugestao, setBuscandoSugestao] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);
  const [usouIA, setUsouIA] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [arquivoTemp, setArquivoTemp] = useState<File | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function adicionarArquivo() {
    if (!arquivoTemp) return;
    setArquivos((atual) => [...atual, arquivoTemp]);
    setArquivoTemp(null);
    // limpa o input de arquivo visualmente
    const input = document.getElementById("input-arquivo-consulta") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function removerArquivo(index: number) {
    setArquivos((atual) => atual.filter((_, i) => i !== index));
  }

  async function buscarSugestaoIA() {
    setErroSugestao(null);
    setBuscandoSugestao(true);
    try {
      const resposta = await fetch("/api/ia/sugestao-diagnostica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          motivoAtual: motivo,
          anamneseAtual: anamnese,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErroSugestao(dados.erro ?? "Erro ao gerar sugestão.");
        setBuscandoSugestao(false);
        return;
      }
      setSugestaoIA(dados.sugestao);
      setUsouIA(true);
    } catch {
      setErroSugestao("Erro de conexão com a IA.");
    }
    setBuscandoSugestao(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sessão expirada. Faça login novamente.");
      setSalvando(false);
      return;
    }

    // 1. Cria o encontro (a consulta em si)
    const duracaoSegundos = pararEObterDuracao(); // trava o timer visual e pega a duração final
    const { data: encontro, error: erroEncontro } = await supabase
      .from("encontros")
      .insert({
        paciente_id: pacienteId,
        profissional_id: user.id,
        data_hora: new Date().toISOString(),
        tipo_atendimento: tipoAtendimento,
        status: "finalizado",
        duracao_segundos: duracaoSegundos,
      })
      .select()
      .single();

    if (erroEncontro || !encontro) {
      setErro("Erro ao criar consulta: " + erroEncontro?.message);
      setSalvando(false);
      return;
    }

    // 2. Cria a evolução clínica (parte geral)
    const { data: evolucao, error: erroEvolucao } = await supabase
      .from("evolucoes")
      .insert({
        encontro_id: encontro.id,
        autor_id: user.id,
        motivo_consulta: motivo,
        anamnese,
        exame_fisico: null,
        observacoes: null,
        uso_de_ia: usouIA,
        ia_revisado_por: usouIA ? user.id : null,
        ia_revisado_em: usouIA ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (erroEvolucao || !evolucao) {
      setErro("Erro ao salvar evolução: " + erroEvolucao?.message);
      setSalvando(false);
      return;
    }

    // 3. Cria o diagnóstico/conduta (tabela separada — bloqueada para recepção/admin puro)
    const { error: erroDiagnostico } = await supabase.from("evolucoes_diagnostico").insert({
      evolucao_id: evolucao.id,
      autor_id: user.id,
      diagnostico_cid: diagnostico,
      conduta,
      sugestao_ia: sugestaoIA ? { texto: sugestaoIA, gerado_em: new Date().toISOString() } : null,
    });

    if (erroDiagnostico) {
      setErro("Evolução salva, mas houve erro no diagnóstico: " + erroDiagnostico.message);
      setSalvando(false);
      return;
    }

    // 4. Envia os anexos de exame desta consulta (se houver), já vinculados ao encontro
    const falhas: string[] = [];
    if (arquivos.length > 0) {
      for (const arquivo of arquivos) {
        const caminho = `${pacienteId}/${encontro.id}/${Date.now()}_${arquivo.name}`;

        const { error: erroUpload } = await supabase.storage
          .from("exames")
          .upload(caminho, arquivo);

        if (erroUpload) {
          falhas.push(`${arquivo.name} (upload: ${erroUpload.message})`);
          continue;
        }

        const tipo = arquivo.type.includes("pdf")
          ? "pdf"
          : arquivo.type.includes("image")
          ? "imagem"
          : "outro";

        const { error: erroInsert } = await supabase.from("anexos_exames").insert({
          paciente_id: pacienteId,
          encontro_id: encontro.id,
          enviado_por: user.id,
          nome_arquivo: arquivo.name,
          tipo,
          caminho_storage: caminho,
        });

        if (erroInsert) {
          falhas.push(`${arquivo.name} (registro: ${erroInsert.message})`);
        }
      }
    }

    setSalvando(false);

    if (falhas.length > 0) {
      setErro(
        `Consulta salva. Mas ${falhas.length} de ${arquivos.length} anexo(s) falharam: ` +
          falhas.join("; ")
      );
    }

    // Limpa o formulário
    setMotivo("");
    setAnamnese("");
    setDiagnostico("");
    setConduta("");
    setArquivos([]);
    setArquivoTemp(null);
    setSugestaoIA(null);
    setUsouIA(false);
    router.refresh();
  }

  return (
    <form id="form-nova-evolucao" onSubmit={salvar} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)", margin: "0 0 10px" }}>
        Registrar nova consulta
      </p>
      {erro && <p className="erro">{erro}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}>
        <div>
          <label>Tipo de atendimento</label>
          <select value={tipoAtendimento} onChange={(e) => setTipoAtendimento(e.target.value)}>
            <option value="consulta_medica">Consulta médica</option>
            <option value="fisioterapia">Fisioterapia</option>
            <option value="enfermagem">Enfermagem</option>
            <option value="procedimento">Procedimento</option>
          </select>
        </div>
        <div>
          <label>Motivo da consulta</label>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
      </div>

      <label>Anamnese / Exame físico / Observações</label>
      <textarea
        value={anamnese}
        onChange={(e) => setAnamnese(e.target.value)}
        rows={7}
        style={{ width: "100%", marginBottom: 12, padding: 12, flex: 1, lineHeight: 1.65 }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "6px 0 14px", paddingTop: 14, borderTop: "1px solid var(--cor-borda)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cor-marca-clara)", margin: 0 }}>
          Diagnóstico e conduta (não visível à recepção)
        </p>
        {podeUsarIA && (
          <button
            type="button"
            onClick={buscarSugestaoIA}
            disabled={buscandoSugestao}
            style={{ background: "var(--cor-ia-fundo)", color: "var(--cor-ia)", fontSize: 12, padding: "8px 14px", flexShrink: 0 }}
          >
            {buscandoSugestao ? "Consultando IA..." : "Gerar sugestão de IA"}
          </button>
        )}
      </div>
      {erroSugestao && <p className="erro">{erroSugestao}</p>}

      {sugestaoIA && (
        <div
          style={{
            border: "1px solid var(--cor-ia)",
            borderRadius: 11,
            padding: 14,
            marginBottom: 12,
            background: "var(--cor-ia-fundo)",
            fontSize: "0.9rem",
            whiteSpace: "pre-wrap",
          }}
        >
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 11, color: "var(--cor-ia)" }}>
            SUGESTÃO GERADA POR IA — REVISE CRITICAMENTE ANTES DE USAR. A DECISÃO É SEMPRE SUA.
          </p>
          {sugestaoIA}
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setConduta((atual) => (atual.trim() ? atual + "\n\n" + sugestaoIA : sugestaoIA))}
              className="botao-secundario"
              style={{ fontSize: "0.8rem" }}
            >
              Inserir na conduta
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10 }}>
        <div>
          <label>Diagnóstico / CID</label>
          <input
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            style={{ fontFamily: "var(--fonte-mono)", color: "var(--cor-marca-clara)" }}
          />
        </div>
        <div>
          <label>Conduta</label>
          <textarea value={conduta} onChange={(e) => setConduta(e.target.value)} rows={3} style={{ width: "100%", marginBottom: 12, padding: 8 }} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--cor-borda)", paddingTop: 14, marginTop: 4 }}>
        <label>Anexar exame(s) desta consulta (opcional)</label>
        <p style={{ fontSize: "0.85rem", margin: "0 0 8px", color: "var(--cor-texto-suave)" }}>
          Exame de análises clínicas (sangue)? Anexe o PDF e lance os resultados no ícone <b>"Exames de análises clínicas"</b> no menu.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            id="input-arquivo-consulta"
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setArquivoTemp(e.target.files?.[0] ?? null)}
            style={{ border: "1px dashed var(--cor-borda-input)", background: "transparent" }}
          />
          <button type="button" onClick={adicionarArquivo} disabled={!arquivoTemp} className="botao-secundario">
            Adicionar à consulta
          </button>
        </div>

        {arquivos.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, marginBottom: 12 }}>
            {arquivos.map((f, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 0",
                  fontSize: "0.9rem",
                }}
              >
                <span>{f.name}</span>
                <button
                  type="button"
                  onClick={() => removerArquivo(i)}
                  style={{ background: "transparent", color: "var(--cor-erro)", padding: "2px 8px" }}
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" disabled={salvando} style={{ marginTop: 8, alignSelf: "flex-start" }}>
        {salvando ? "Salvando..." : "Salvar consulta"}
      </button>
    </form>
  );
}
