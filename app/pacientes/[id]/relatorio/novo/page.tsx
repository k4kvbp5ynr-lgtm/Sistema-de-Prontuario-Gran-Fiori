import NovoRelatorioForm from "../novo-relatorio-form";
import BotaoVoltarPaciente from "../../../botao-voltar-paciente";

export default async function NovoRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <BotaoVoltarPaciente pacienteId={id} />
      <NovoRelatorioForm pacienteId={id} />
    </>
  );
}
