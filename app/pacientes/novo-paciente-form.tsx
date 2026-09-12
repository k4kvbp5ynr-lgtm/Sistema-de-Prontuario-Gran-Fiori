"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NovoPacienteForm() {
  const router = useRouter();
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const { error } = await supabase.from("pacientes").insert({
      nome,
      cpf: cpf || null,
    });

    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar: " + error.message);
      return;
    }

    setNome("");
    setCpf("");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} style={{ marginTop: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: "1.1rem" }}>Novo paciente</h2>
      {erro && <p className="erro">{erro}</p>}
      <input
        placeholder="Nome completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
      />
      <input
        placeholder="CPF (opcional por enquanto)"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
      />
      <button type="submit" disabled={salvando}>
        {salvando ? "Salvando..." : "Adicionar paciente"}
      </button>
    </form>
  );
}
