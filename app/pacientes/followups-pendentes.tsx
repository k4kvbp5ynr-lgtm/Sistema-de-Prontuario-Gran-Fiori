"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Tarefa = {
  id: string;
  paciente_id: string;
  rotulo: string;
  data_prevista: string;
  observacao: string | null;
  pacientes: { nome: string; telefone: string | null } | null;
};

export default function FollowupsPendentes() {
  const supabase = createClient();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [observacaoAberta, setObservacaoAberta] = useState<string | null>(null);
  const [observacaoTexto, setObservacaoTexto] = useState("");

  async function carregar() {
    const { data } = await supabase
      .from("tarefas_followup")
      .select("id, paciente_id, rotulo, data_prevista, observacao, pacientes ( nome, telefone )")
      .eq("status", "pendente")
      .order("data_prevista");
    setTarefas((data as any) ?? []);
    setCarregado(true);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function concluir(id: string, status: "feito" | "pulado", observacao?: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("tarefas_followup")
      .update({ status, observacao: observacao || null, concluido_por: user?.id, concluido_em: new Date().toISOString() })
      .eq("id", id);
    setObservacaoAberta(null);
    setObservacaoTexto("");
    carregar();
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const em14dias = new Date();
  em14dias.setDate(em14dias.getDate() + 14);
  const limite14 = em14dias.toISOString().slice(0, 10);

  const [verTodos, setVerTodos] = useState(false);
  const visiveis = verTodos ? tarefas : tarefas.filter((t) => t.data_prevista <= limite14);

  if (!carregado || tarefas.length === 0) return null;

  return (
    <div style={{ background: "var(--cor-fundo-card)", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: 16, marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>
          Follow-ups pendentes <span style={{ fontWeight: 400, color: "var(--cor-texto-fraco)" }}>({tarefas.length})</span>
        </p>
        {tarefas.length > visiveis.length || verTodos ? (
          <button type="button" onClick={() => setVerTodos(!verTodos)} className="botao-secundario" style={{ fontSize: 11, padding: "4px 10px" }}>
            {verTodos ? "Mostrar só próximos 14 dias" : `Ver todos (${tarefas.length})`}
          </button>
        ) : null}
      </div>
      {visiveis.map((t) => {
        const atrasado = t.data_prevista < hoje;
        return (
          <div key={t.id} style={{ borderTop: "1px solid var(--cor-borda)", padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13 }}>
                  <Link href={`/pacientes/${t.paciente_id}`} style={{ fontWeight: 700 }}>
                    {t.pacientes?.nome ?? "—"}
                  </Link>{" "}
                  — {t.rotulo}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: atrasado ? "var(--cor-erro)" : "var(--cor-texto-fraco)" }}>
                  Previsto: {new Date(t.data_prevista + "T00:00:00").toLocaleDateString("pt-BR")}
                  {atrasado && " · atrasado"}
                  {t.pacientes?.telefone && ` · ${t.pacientes.telefone}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setObservacaoAberta(observacaoAberta === t.id ? null : t.id)} style={{ fontSize: 11, padding: "5px 12px" }}>
                  Marcar feito
                </button>
                <button type="button" onClick={() => concluir(t.id, "pulado")} className="botao-secundario" style={{ fontSize: 11, padding: "5px 12px" }}>
                  Pular
                </button>
              </div>
            </div>
            {observacaoAberta === t.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  placeholder="Como foi o contato? (opcional)"
                  value={observacaoTexto}
                  onChange={(e) => setObservacaoTexto(e.target.value)}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button type="button" onClick={() => concluir(t.id, "feito", observacaoTexto)} style={{ fontSize: 11 }}>
                  Confirmar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
