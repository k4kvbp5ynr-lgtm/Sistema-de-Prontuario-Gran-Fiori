import NovaPrescricaoForm from "../novo-prescricao-form";

export default async function NovaReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div style={{ padding: "22px 26px", maxWidth: 640 }}>
      <NovaPrescricaoForm pacienteId={id} />
    </div>
  );
}
