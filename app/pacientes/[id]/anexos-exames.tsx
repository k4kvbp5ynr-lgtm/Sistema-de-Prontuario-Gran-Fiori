"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Anexo = {
  id: string;
  nome_arquivo: string;
  tipo: string | null;
  descricao: string | null;
  caminho_storage: string;
  criado_em: string;
};

export default function AnexosExames({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarLista() {
    const { data } = await supabase
      .from("anexos_exames")
      .select("id, nome_arquivo, tipo, descricao, caminho_storage, criado_em")
      .eq("paciente_id", pacienteId)
      .is("encontro_id", null)
      .order("criado_em", { ascending: false });
    setAnexos(data ?? []);
  }

  useEffect(() => {
    carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sessão expirada. Faça login novamente.");
      setEnviando(false);
      return;
    }

    const caminho = `${pacienteId}/${Date.now()}_${arquivo.name}`;

    const { error: erroUpload } = await supabase.storage
      .from("exames")
      .upload(caminho, arquivo);

    if (erroUpload) {
      setErro("Erro ao enviar arquivo: " + erroUpload.message);
      setEnviando(false);
      return;
    }

    const tipo = arquivo.type.includes("pdf")
      ? "pdf"
      : arquivo.type.includes("image")
      ? "imagem"
      : "outro";

    const { error: erroRegistro } = await supabase.from("anexos_exames").insert({
      paciente_id: pacienteId,
      enviado_por: user.id,
      nome_arquivo: arquivo.name,
      tipo,
      caminho_storage: caminho,
      descricao,
    });

    setEnviando(false);

    if (erroRegistro) {
      setErro("Arquivo enviado, mas houve erro ao salvar o registro: " + erroRegistro.message);
      return;
    }

    setArquivo(null);
    setDescricao("");
    carregarLista();
  }

  async function baixar(caminho: string) {
    const { data, error } = await supabase.storage
      .from("exames")
      .createSignedUrl(caminho, 60); // link válido por 60 segundos

    if (error || !data) {
      alert("Não foi possível gerar o link do arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 32 }}>
      <h2 style={{ fontSize: "1.1rem" }}>Exames avulsos (sem consulta específica)</h2>

      <form onSubmit={enviar} style={{ marginBottom: 16 }}>
        {erro && <p className="erro">{erro}</p>}
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
        <input
          placeholder="Descrição (ex: hemograma, raio-x joelho)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <button type="submit" disabled={!arquivo || enviando}>
          {enviando ? "Enviando..." : "Anexar exame"}
        </button>
      </form>

      {anexos.length === 0 && <p>Nenhum exame anexado ainda.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {anexos.map((a) => (
          <li
            key={a.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #e5e0d8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {a.nome_arquivo} {a.descricao && `— ${a.descricao}`}
              <br />
              <small>{new Date(a.criado_em).toLocaleString("pt-BR")}</small>
            </span>
            <button type="button" onClick={() => baixar(a.caminho_storage)}>
              Abrir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
