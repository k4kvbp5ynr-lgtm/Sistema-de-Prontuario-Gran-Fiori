import { createClient } from "@/lib/supabase/server";
import NovaEvolucaoForm from "./nova-evolucao-form";

export default async function DetalhePacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nome, cpf, data_nascimento")
    .eq("id", id)
    .single();

  // Busca o histórico: encontros -> evoluções -> diagnóstico/conduta
  const { data: encontros } = await supabase
    .from("encontros")
    .select(
      `
      id, data_hora, tipo_atendimento,
      evolucoes (
        id, motivo_consulta, anamnese, exame_fisico, observacoes,
        evolucoes_diagnostico ( diagnostico_cid, conduta )
      )
    `
    )
    .eq("paciente_id", id)
    .order("data_hora", { ascending: false });

  if (!paciente) {
    return (
      <div className="container">
        <p>Paciente não encontrado (ou você não tem permissão para ver este registro).</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>{paciente.nome}</h1>
      <p>CPF: {paciente.cpf ?? "—"}</p>

      <NovaEvolucaoForm pacienteId={paciente.id} />

      <h2 style={{ fontSize: "1.1rem" }}>Histórico</h2>
      {(!encontros || encontros.length === 0) && <p>Nenhuma consulta registrada ainda.</p>}

      {encontros?.map((enc: any) => (
        <div
          key={enc.id}
          style={{
            border: "1px solid #e5e0d8",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <strong>{new Date(enc.data_hora).toLocaleString("pt-BR")}</strong> —{" "}
          {enc.tipo_atendimento}
          {enc.evolucoes?.map((ev: any) => (
            <div key={ev.id} style={{ marginTop: 8 }}>
              {ev.motivo_consulta && <p><b>Motivo:</b> {ev.motivo_consulta}</p>}
              {ev.anamnese && <p><b>Anamnese:</b> {ev.anamnese}</p>}
              {ev.exame_fisico && <p><b>Exame físico:</b> {ev.exame_fisico}</p>}
              {ev.observacoes && <p><b>Observações:</b> {ev.observacoes}</p>}
              {ev.evolucoes_diagnostico?.map((d: any, i: number) => (
                <div key={i}>
                  {d.diagnostico_cid && <p><b>Diagnóstico:</b> {d.diagnostico_cid}</p>}
                  {d.conduta && <p><b>Conduta:</b> {d.conduta}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
