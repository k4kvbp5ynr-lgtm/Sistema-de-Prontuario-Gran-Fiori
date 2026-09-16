import { createClient } from "@/lib/supabase/server";
import NovaEvolucaoForm from "./nova-evolucao-form";
import AnexosExames from "./anexos-exames";
import BotaoAbrirAnexo from "./botao-abrir-anexo";
import CadastroPaciente from "./cadastro-paciente";
import ProcedimentosPaciente from "./procedimentos-paciente";
import ExamesLaboratoriais from "./exames-laboratoriais/exames-laboratoriais";
import NovaPrescricaoForm from "./receituario/novo-prescricao-form";
import ConsultaGenetica from "./consulta-genetica";
import SubmenuPilulas, { ItemSubmenu } from "./submenu-pilulas";
import { ConsultaTimerProvider } from "./consulta-timer-context";
import TimerConsultaWidget from "./timer-consulta-widget";

export default async function DetalhePacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: meuUsuario } = user
    ? await supabase.from("usuarios").select("perfil, admin_extra, pode_usar_ia").eq("id", user.id).single()
    : { data: null };
  const souRecepcao = meuUsuario?.perfil === "recepcao";
  const podeUsarIA = meuUsuario?.pode_usar_ia ?? false;

  const { data: paciente, error: erroPaciente } = await supabase
    .from("pacientes")
    .select("id, nome, cpf, data_nascimento, sexo, endereco, telefone, email, foto_path, peso, altura")
    .eq("id", id)
    .single();

  const { data: encontros } = await supabase
    .from("encontros")
    .select(
      `
      id, data_hora, tipo_atendimento, duracao_segundos,
      usuarios!profissional_id ( nome, perfil ),
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
          <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-muito-fraco)" }}>
            Detalhe técnico (me envie isso): {erroPaciente.message}
          </p>
        )}
      </div>
    );
  }

  const itens: ItemSubmenu[] = [
    { tipo: "link", id: "voltar", label: "Voltar", href: "/pacientes" },
    {
      tipo: "painel",
      id: "anamnese",
      label: "Anamnese",
      conteudo: souRecepcao ? (
        <>
          <h2 style={{ fontSize: "1.1rem" }}>Anexar exames</h2>
          <AnexosExames pacienteId={paciente.id} />
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ background: "var(--cor-fundo-card)", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: 18 }}>
            <NovaEvolucaoForm pacienteId={paciente.id} podeUsarIA={podeUsarIA} />
          </div>
          <div style={{ background: "var(--cor-fundo-card)", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: 18 }}>
            <NovaPrescricaoForm pacienteId={paciente.id} />
          </div>
        </div>
      ),
    },
    {
      tipo: "painel",
      id: "exames-lab",
      label: "Exames de análises clínicas",
      conteudo: <ExamesLaboratoriais pacienteId={paciente.id} sexoPaciente={paciente.sexo} podeUsarIA={podeUsarIA} />,
    },
    {
      tipo: "painel",
      id: "exames-avulsos",
      label: "Exames avulsos",
      conteudo: <AnexosExames pacienteId={paciente.id} />,
    },
    {
      tipo: "painel",
      id: "procedimentos",
      label: "Procedimentos (reembolso)",
      conteudo: <ProcedimentosPaciente pacienteId={paciente.id} />,
    },
    {
      tipo: "painel",
      id: "genetica",
      label: "Genética",
      conteudo: <ConsultaGenetica pacienteId={paciente.id} />,
    },
    {
      tipo: "painel",
      id: "historico",
      label: "Histórico",
      conteudo: (
        <>
          <h2 style={{ fontSize: "1.1rem" }}>Histórico</h2>
          {(!encontros || encontros.length === 0) && <p>Nenhuma consulta registrada ainda.</p>}
          {encontros?.map((enc: any) => (
            <div
              key={enc.id}
              style={{ border: "1px solid var(--cor-borda)", borderRadius: 8, padding: 16, marginBottom: 12 }}
            >
              <strong>{new Date(enc.data_hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</strong> — {enc.tipo_atendimento}
              {enc.usuarios && (
                <span style={{ fontSize: "0.85rem", color: "var(--cor-texto-suave)" }}>
                  {" "}
                  · salvo por {enc.usuarios.nome}
                </span>
              )}
              {enc.duracao_segundos != null && (
                <span style={{ fontSize: "0.85rem", color: "var(--cor-texto-suave)" }}>
                  {" "}
                  · duração: {Math.floor(enc.duracao_segundos / 60)}min {enc.duracao_segundos % 60}s
                </span>
              )}
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

  return (
    <ConsultaTimerProvider>
      <div style={{ padding: "22px 26px" }}>
        <SubmenuPilulas
          itens={itens}
          itemInicial="anamnese"
          cabecalho={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <CadastroPaciente paciente={paciente} />
              </div>
              {!souRecepcao && <TimerConsultaWidget />}
            </div>
          }
        />
      </div>
    </ConsultaTimerProvider>
  );
}
