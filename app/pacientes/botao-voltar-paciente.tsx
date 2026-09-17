import Link from "next/link";

export default function BotaoVoltarPaciente({ pacienteId }: { pacienteId: string }) {
  return (
    <div style={{ padding: "14px 26px 0" }}>
      <Link
        href={`/pacientes/${pacienteId}`}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--cor-texto-suave)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ← Voltar
      </Link>
    </div>
  );
}
