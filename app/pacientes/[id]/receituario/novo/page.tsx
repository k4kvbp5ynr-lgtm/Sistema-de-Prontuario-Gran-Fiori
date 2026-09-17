import NovaPrescricaoForm from "../novo-prescricao-form";
import BotaoVoltarPaciente from "../../../botao-voltar-paciente";

export default async function NovaReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div style={{ padding: "22px 26px", maxWidth: 640 }}>
      <div style={{ marginLeft: -26, marginTop: -22, marginBottom: 8 }}>
        <BotaoVoltarPaciente pacienteId={id} />
      </div>
      <NovaPrescricaoForm pacienteId={id} />
    </div>
  );
}
