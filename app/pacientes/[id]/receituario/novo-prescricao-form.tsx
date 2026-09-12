"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NovaPrescricaoForm({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [conteudo, setConteudo] = useState("");
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

    const { data: prescricao, error } = await supabase
      .from("prescricoes")
      .insert({
        paciente_id: pacienteId,
        profissional_id: user.id,
        tipo: "receituario",
        conteudo,
      })
      .select()
      .single();

    setSalvando(false);

    if (error || !prescricao) {
      setErro("Erro ao salvar: " + error?.message);
      return;
    }

    router.push(`/pacientes/${pacienteId}/receituario/${prescricao.id}`);
  }

  return (
    <form onSubmit={salvar} className="container" style={{ padding: "24px 0" }}>
      <h1>Nova prescrição</h1>
      {erro && <p className="erro">{erro}</p>}
      <textarea
        placeholder={
          "Escreva aqui o conteúdo da prescrição.\nEx:\nDipirona 500mg — 1 comprimido a cada 6h se dor, por 3 dias"
        }
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={10}
        required
        style={{ width: "100%", padding: 12, fontSize: "1rem" }}
      />
      <button type="submit" disabled={salvando} style={{ marginTop: 12 }}>
        {salvando ? "Salvando..." : "Salvar e visualizar"}
      </button>
    </form>
  );
}
