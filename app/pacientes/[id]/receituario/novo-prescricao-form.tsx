"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ModelosSalvos from "./modelos-salvos";

const TIPOS_RECEITA = [
  { valor: "simples", label: "Simples" },
  { valor: "controle_especial", label: "Controle especial (dupla via)" },
  { valor: "antibiotico", label: "Antibiótico (dupla via)" },
];

export default function NovaPrescricaoForm({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [conteudo, setConteudo] = useState("");
  const [subtipo, setSubtipo] = useState("simples");
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
        subtipo_receita: subtipo,
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
    <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)", margin: 0 }}>
          Prescrição desta consulta (opcional)
        </p>
        <span style={{ background: "var(--cor-ia-fundo)", color: "var(--cor-ia)", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 9 }}>
          assinatura A1
        </span>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <label>Tipo de receita</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {TIPOS_RECEITA.map((t) => {
          const ativo = subtipo === t.valor;
          return (
            <button
              key={t.valor}
              type="button"
              onClick={() => setSubtipo(t.valor)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: ativo ? 700 : 600,
                background: ativo ? "var(--cor-marca-fundo)" : "transparent",
                border: ativo ? "1px solid var(--cor-marca)" : "1px solid var(--cor-borda-input)",
                color: ativo ? "var(--cor-marca-clara)" : "var(--cor-texto-suave)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: "#152e2b", border: "1px solid #23504a", borderRadius: 11, padding: 10, marginBottom: 12 }}>
        <ModelosSalvos
          conteudoAtual={conteudo}
          onInserir={(texto) => setConteudo((atual) => (atual.trim() ? atual + "\n" + texto : texto))}
        />
      </div>

      <label>Conteúdo da prescrição</label>
      <textarea
        placeholder={"Escreva aqui o conteúdo da prescrição.\nEx:\nDipirona 500mg — 1 comprimido a cada 6h se dor, por 3 dias"}
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={10}
        required
        style={{ width: "100%", padding: 12, flex: 1, whiteSpace: "pre-wrap", lineHeight: 1.7 }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Link href={`/pacientes/${pacienteId}/relatorio/novo`} className="botao-secundario" style={{ padding: "10px 18px", borderRadius: 20, fontSize: 13, textDecoration: "none" }}>
          Novo relatório médico
        </Link>
        <button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar e visualizar"}
        </button>
      </div>
    </form>
  );
}
