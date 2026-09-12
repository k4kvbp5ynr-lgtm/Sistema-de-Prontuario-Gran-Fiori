import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PacientesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pacientes, error } = await supabase
    .from("pacientes")
    .select("id, nome, cpf, criado_em")
    .order("criado_em", { ascending: false });

  return (
    <div className="container">
      <h1>Pacientes</h1>
      <p>Logado como: {user?.email}</p>

      <p style={{ display: "flex", gap: 12 }}>
        <Link href="/pacientes/novo">
          <button type="button">Novo paciente</button>
        </Link>
        <Link href="/equipe">
          <button type="button" style={{ background: "#555" }}>
            Gerenciar equipe
          </button>
        </Link>
      </p>

      {error && <p className="erro">Erro ao carregar pacientes: {error.message}</p>}

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
          </tr>
        </thead>
        <tbody>
          {pacientes?.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/pacientes/${p.id}`}>{p.nome}</Link>
              </td>
              <td>{p.cpf ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
