import NovoRelatorioForm from "../novo-relatorio-form";

export default async function NovoRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NovoRelatorioForm pacienteId={id} />;
}
