"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NovaEvolucaoForm({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [tipoAtendimento, setTipoAtendimento] = useState("consulta_medica");
  const [motivo, setMotivo] = useState("");
  const [anamnese, setAnamnese] = useState("");
  const [exameFisico, setExameFisico] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [conduta, setConduta] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

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
    const { data: encontro, error: erroEncontro } = await supabase
      .from("encontros")
      .insert({
        paciente_id: pacienteId,
        profissional_id: user.id,
        data_hora: new Date().toISOString(),
        tipo_atendimento: tipoAtendimento,
        status: "finalizado",
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
        exame_fisico: exameFisico,
        observacoes,
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
    setExameFisico("");
    setObservacoes("");
    setDiagnostico("");
    setConduta("");
    setArquivos([]);
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
        placeholder="Anamnese"
        value={anamnese}
        onChange={(e) => setAnamnese(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 12, padding: 8 }}
      />
      <textarea
        placeholder="Exame físico"
        value={exameFisico}
        onChange={(e) => setExameFisico(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 12, padding: 8 }}
      />
      <textarea
        placeholder="Observações"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        rows={2}
        style={{ width: "100%", marginBottom: 12, padding: 8 }}
      />

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e0d8" }} />
      <p style={{ fontSize: "0.85rem", color: "#7a5a2f", marginBottom: 8 }}>
        Diagnóstico e conduta (não visível à recepção)
      </p>
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

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e0d8" }} />
      <label>Anexar exame(s) desta consulta (opcional)</label>
      <input
        type="file"
        accept=".pdf,image/*"
        multiple
        onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
        style={{ marginBottom: 4 }}
      />
      {arquivos.length > 0 && (
        <p style={{ fontSize: "0.85rem", color: "#555", marginBottom: 12 }}>
          {arquivos.length} arquivo(s) selecionado(s): {arquivos.map((f) => f.name).join(", ")}
        </p>
      )}

      <button type="submit" disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar consulta"}
      </button>
    </form>
  );
}
