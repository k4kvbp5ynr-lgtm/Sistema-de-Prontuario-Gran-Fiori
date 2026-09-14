"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Paciente = {
  id: string;
  nome: string;
  cpf: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  foto_path: string | null;
  peso: number | null;
  altura: number | null;
};

export default function CadastroPaciente({ paciente }: { paciente: Paciente }) {
  const router = useRouter();
  const supabase = createClient();

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(paciente.nome);
  const [cpf, setCpf] = useState(paciente.cpf ?? "");
  const [dataNascimento, setDataNascimento] = useState(paciente.data_nascimento ?? "");
  const [sexo, setSexo] = useState(paciente.sexo ?? "");
  const [endereco, setEndereco] = useState(paciente.endereco ?? "");
  const [telefone, setTelefone] = useState(paciente.telefone ?? "");
  const [email, setEmail] = useState(paciente.email ?? "");
  const [peso, setPeso] = useState(paciente.peso != null ? String(paciente.peso).replace(".", ",") : "");
  const [altura, setAltura] = useState(paciente.altura != null ? String(paciente.altura).replace(".", ",") : "");
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarFoto() {
      if (!paciente.foto_path) return;
      const { data } = await supabase.storage
        .from("fotos-pacientes")
        .createSignedUrl(paciente.foto_path, 300);
      if (data) setFotoUrl(data.signedUrl);
    }
    carregarFoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.foto_path]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const { error } = await supabase
      .from("pacientes")
      .update({
        nome,
        cpf: cpf || null,
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        endereco: endereco || null,
        telefone: telefone || null,
        email: email || null,
        peso: peso ? parseFloat(peso.replace(",", ".")) : null,
        altura: altura ? parseFloat(altura.replace(",", ".")) : null,
      })
      .eq("id", paciente.id);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      setSalvando(false);
      return;
    }

    if (novaFoto) {
      const caminho = `${paciente.id}/foto_${Date.now()}_${novaFoto.name}`;
      const { error: erroUpload } = await supabase.storage
        .from("fotos-pacientes")
        .upload(caminho, novaFoto);

      if (!erroUpload) {
        await supabase.from("pacientes").update({ foto_path: caminho }).eq("id", paciente.id);
      } else {
        setErro("Dados salvos, mas houve erro ao enviar a nova foto: " + erroUpload.message);
      }
    }

    setSalvando(false);
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
        {fotoUrl && (
          <img
            src={fotoUrl}
            alt=""
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
          />
        )}
        <div>
          <h1 style={{ margin: 0 }}>{paciente.nome}</h1>
          <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
            CPF: {paciente.cpf ?? "—"}
            {paciente.data_nascimento &&
              ` · Nascimento: ${new Date(paciente.data_nascimento).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
          </p>
          <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
            {paciente.telefone ?? "—"} · {paciente.email ?? "—"}
          </p>
          <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>{paciente.endereco ?? "—"}</p>
          <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
            {paciente.peso != null ? `${paciente.peso} kg` : "Peso —"} · {paciente.altura != null ? `${paciente.altura} cm` : "Altura —"}
          </p>
          <button type="button" onClick={() => setEditando(true)} style={{ marginTop: 8 }}>
            Editar cadastro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} style={{ marginBottom: 16, maxWidth: 480 }}>
      {erro && <p className="erro">{erro}</p>}
      <label>Nome completo</label>
      <input value={nome} onChange={(e) => setNome(e.target.value)} required />
      <label>CPF</label>
      <input value={cpf} onChange={(e) => setCpf(e.target.value)} />
      <label>Data de nascimento</label>
      <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
      <label>Sexo</label>
      <select value={sexo} onChange={(e) => setSexo(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 12 }}>
        <option value="">Selecione</option>
        <option value="feminino">Feminino</option>
        <option value="masculino">Masculino</option>
        <option value="outro">Outro</option>
      </select>
      <label>Endereço completo</label>
      <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      <label>Telefone</label>
      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      <label>E-mail</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label>Peso (kg)</label>
      <input value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 72,5" />
      <label>Altura (cm)</label>
      <input value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="Ex: 175" />
      <label>Trocar foto</label>
      <input type="file" accept="image/*" onChange={(e) => setNovaFoto(e.target.files?.[0] ?? null)} style={{ marginBottom: 16 }} />

      <button type="submit" disabled={salvando} style={{ marginRight: 8 }}>
        {salvando ? "Salvando..." : "Salvar alterações"}
      </button>
      <button type="button" onClick={() => setEditando(false)} style={{ background: "transparent", color: "#666" }}>
        Cancelar
      </button>
    </form>
  );
}
