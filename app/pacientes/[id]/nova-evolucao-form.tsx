"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <form onSubmit={salvar} style={{ marginTop: 24, marginBottom: 32 }}>
      <h2 style={{ fontSize: "1.1rem" }}>Registrar nova consulta</h2>
      {erro && <p className="erro">{erro}</p>}

      <label>Tipo de atendimento</label>
      <select
        value={tipoAtendimento}
        onChange={(e) => setTipoAtendimento(e.target.value)}
        style={{ marginBottom: 12, padding: 8, width: "100%" }}
      >
        <option value="consulta_medica">Consulta médica</option>
        <option value="fisioterapia">Fisioterapia</option>
        <option value="enfermagem">Enfermagem</option>
        <option value="procedimento">Procedimento</option>
      </select>

      <input
        placeholder="Motivo da consulta"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <textarea
        placeholder="Anamnese / Exame físico / Observações"
        value={anamnese}
        onChange={(e) => setAnamnese(e.target.value)}
        rows={7}
        style={{ width: "100%", marginBottom: 12, padding: 8 }}
      />

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--cor-borda)" }} />
      <p style={{ fontSize: "0.85rem", color: "var(--cor-marca)", marginBottom: 8 }}>
        Diagnóstico e conduta (não visível à recepção)
      </p>

      {podeUsarIA && (
        <>
          <button type="button" onClick={buscarSugestaoIA} disabled={buscandoSugestao} style={{ marginBottom: 12, background: "var(--cor-ia)" }}>
            {buscandoSugestao ? "Consultando IA..." : "🤖 Gerar sugestão de IA"}
          </button>
          {erroSugestao && <p className="erro">{erroSugestao}</p>}
        </>
      )}

      {sugestaoIA && (
        <div
          style={{
            border: "1px solid var(--cor-ia)",
            borderRadius: 6,
            padding: 12,
            marginBottom: 12,
            background: "var(--cor-ia-fundo)",
            fontSize: "0.9rem",
            whiteSpace: "pre-wrap",
          }}
        >
          <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "var(--cor-ia)" }}>
            🤖 Sugestão gerada por IA — revise criticamente antes de usar. Nunca é comunicada automaticamente ao
            paciente; a decisão é sempre sua.
          </p>
          {sugestaoIA}
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setConduta((atual) => (atual.trim() ? atual + "\n\n" + sugestaoIA : sugestaoIA))}
              style={{ fontSize: "0.8rem" }}
            >
              Inserir na conduta
            </button>
          </div>
        </div>
      )}

      <input
        placeholder="Diagnóstico / CID"
        value={diagnostico}
        onChange={(e) => setDiagnostico(e.target.value)}
      />
      <textarea
        placeholder="Conduta"
        value={conduta}
        onChange={(e) => setConduta(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 12, padding: 8 }}
      />

      <Link href={`/pacientes/${pacienteId}/receituario/novo`}>
        <button type="button">Nova prescrição</button>
      </Link>
      {" "}
      <Link href={`/pacientes/${pacienteId}/relatorio/novo`}>
        <button type="button" style={{ background: "#8a6d3b" }}>
          Novo relatório médico
        </button>
      </Link>

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--cor-borda)" }} />
      <label>Anexar exame(s) desta consulta (opcional)</label>
      <p style={{ fontSize: "0.85rem", margin: "0 0 8px", color: "var(--cor-texto-suave)" }}>
        📋 Exame de análises clínicas (sangue)? Anexe o PDF e lance os resultados no ícone{" "}
        <b>"Exames de análises clínicas"</b> no menu à esquerda.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input
          id="input-arquivo-consulta"
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setArquivoTemp(e.target.files?.[0] ?? null)}
        />
        <button type="button" onClick={adicionarArquivo} disabled={!arquivoTemp}>
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
              <span>📎 {f.name}</span>
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

      <button type="submit" disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar consulta"}
      </button>
    </form>
  );
}
