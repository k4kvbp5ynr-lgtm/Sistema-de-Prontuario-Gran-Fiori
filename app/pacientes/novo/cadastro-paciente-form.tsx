"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPacienteForm() {
  const router = useRouter();
  const supabase = createClient();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [foto, setFoto] = useState<File | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const { data: paciente, error } = await supabase
      .from("pacientes")
      .insert({
        nome,
        cpf: cpf || null,
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        endereco: endereco || null,
        telefone: telefone || null,
        email: email || null,
      })
      .select()
      .single();

    if (error || !paciente) {
      setErro("Não foi possível salvar: " + error?.message);
      setSalvando(false);
      return;
    }

    // Se uma foto foi escolhida, envia depois de já ter o id do paciente
    if (foto) {
      const caminho = `${paciente.id}/foto_${Date.now()}_${foto.name}`;
      const { error: erroUpload } = await supabase.storage
        .from("fotos-pacientes")
        .upload(caminho, foto);

      if (!erroUpload) {
        await supabase.from("pacientes").update({ foto_path: caminho }).eq("id", paciente.id);
      } else {
        setErro("Paciente salvo, mas houve erro ao enviar a foto: " + erroUpload.message);
      }
    }

    setSalvando(false);
    router.push(`/pacientes/${paciente.id}`);
  }

  return (
    <form onSubmit={salvar} className="container" style={{ padding: "24px 0" }}>
      <h1>Novo paciente</h1>
      {erro && <p className="erro">{erro}</p>}

      <label>Nome completo</label>
      <input value={nome} onChange={(e) => setNome(e.target.value)} required />

      <label>CPF</label>
      <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Opcional por enquanto" />

      <label>Data de nascimento</label>
      <input
        type="date"
        value={dataNascimento}
        onChange={(e) => setDataNascimento(e.target.value)}
      />

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
      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />

      <label>E-mail</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label>Foto do paciente</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
        style={{ marginBottom: 16 }}
      />

      <button type="submit" disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar paciente"}
      </button>
    </form>
  );
}
