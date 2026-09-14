import { createClient } from "@/lib/supabase/server";
import BuscaPacientes from "./busca-pacientes";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default async function PacientesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pacientes, error } = await supabase
    .from("pacientes")
    .select("id, nome, cpf, criado_em")
    .order("criado_em", { ascending: false });

  const conteudo = (
    <>
      <h1>Pacientes</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", marginBottom: 8 }}>Logado como: {user?.email}</p>
      {error && <p className="erro">Erro ao carregar pacientes: {error.message}</p>}
      <BuscaPacientes pacientes={pacientes ?? []} />
    </>
  );

  return <MenuLateral itens={itensMenuPrincipal("pacientes", conteudo)} itemInicial="pacientes" />;
}

