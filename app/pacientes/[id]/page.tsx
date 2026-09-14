import { createClient } from "@/lib/supabase/server";
import NovaEvolucaoForm from "./nova-evolucao-form";
import AnexosExames from "./anexos-exames";
import BotaoAbrirAnexo from "./botao-abrir-anexo";
import CadastroPaciente from "./cadastro-paciente";
import ProcedimentosPaciente from "./procedimentos-paciente";
import ExamesLaboratoriais from "./exames-laboratoriais/exames-laboratoriais";
import NovaPrescricaoForm from "./receituario/novo-prescricao-form";
import MenuLateral, { ItemMenuLateral } from "../../menu-lateral";

export default async function DetalhePacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente, error: erroPaciente } = await supabase
    .from("pacientes")
    .select("id, nome, cpf, data_nascimento, sexo, endereco, telefone, email, foto_path, peso, altura")
    .eq("id", id)
    .single();

  const { data: encontros } = await supabase
    .from("encontros")
    .select(
      `
      id, data_hora, tipo_atendimento,
      evolucoes (
        id, motivo_consulta, anamnese, exame_fisico, observacoes,
        evolucoes_diagnostico ( diagnostico_cid, conduta )
      ),
      anexos_exames ( id, nome_arquivo, caminho_storage )
    `
    )
    .eq("paciente_id", id)
    .order("data_hora", { ascending: false });

  if (!paciente) {
    return (
      <div className="container">
        <p>Paciente não encontrado (ou você não tem permissão para ver este registro).</p>
        {erroPaciente && (
          <p style={{ fontSize: "0.85rem", color: "#999" }}>
            Detalhe técnico (me envie isso): {erroPaciente.message}
          </p>
        )}
      </div>
    );
  }

  const itens: ItemMenuLateral[] = [
    { tipo: "link", id: "voltar", label: "Voltar", icone: "⬅️", href: "/pacientes" },
    {
      tipo: "painel",
      id: "anamnese",
      label: "Anamnese",
      icone: "📝",
      conteudo: (
        <>
          <h2 style={{ fontSize: "1.1rem" }}>Nova consulta</h2>
          <NovaEvolucaoForm pacienteId={paciente.id} />
          <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid #e5e0d8" }} />
          <h2 style={{ fontSize: "1.1rem" }}>Prescrição desta consulta (opcional)</h2>
          <NovaPrescricaoForm pacienteId={paciente.id} />
        </>
      ),
    },
    {
      tipo: "painel",
      id: "exames-lab",
      label: "Exames de análises clínicas",
      icone: "🧪",
      conteudo: <ExamesLaboratoriais pacienteId={paciente.id} sexoPaciente={paciente.sexo} />,
    },
    {
      tipo: "painel",
      id: "exames-avulsos",
      label: "Exames avulsos",
      icone: "📎",
      conteudo: <AnexosExames pacienteId={paciente.id} />,
    },
    {
      tipo: "painel",
      id: "procedimentos",
      label: "Procedimentos (reembolso)",
      icone: "🩺",
      conteudo: <ProcedimentosPaciente pacienteId={paciente.id} />,
    },
    {
      tipo: "painel",
      id: "historico",
      label: "Histórico",
      icone: "🕒",
      conteudo: (
        <>
          <h2 style={{ fontSize: "1.1rem" }}>Histórico</h2>
          {(!encontros || encontros.length === 0) && <p>Nenhuma consulta registrada ainda.</p>}
          {encontros?.map((enc: any) => (
            <div
              key={enc.id}
              style={{ border: "1px solid #e5e0d8", borderRadius: 8, padding: 16, marginBottom: 12 }}
            >
              <strong>{new Date(enc.data_hora).toLocaleString("pt-BR")}</strong> — {enc.tipo_atendimento}
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
              {enc.anexos_exames?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <b>Exames desta consulta:</b>
                  <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0" }}>
                    {enc.anexos_exames.map((a: any) => (
                      <li key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                        <span>{a.nome_arquivo}</span>
                        <BotaoAbrirAnexo caminho={a.caminho_storage} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </>
      ),
    },
  ];

  return <MenuLateral itens={itens} itemInicial="anamnese" cabecalho={<CadastroPaciente paciente={paciente} />} />;
}
