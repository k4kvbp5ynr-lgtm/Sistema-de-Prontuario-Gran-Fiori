import NovaPrescricaoForm from "../novo-prescricao-form";

export default async function NovaReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NovaPrescricaoForm pacienteId={id} />;
}
