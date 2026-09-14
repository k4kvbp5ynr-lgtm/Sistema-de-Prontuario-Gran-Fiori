import { createClient } from "@/lib/supabase/server";
import BuscaPacientes from "./busca-pacientes";
import BotaoSair from "./botao-sair";
import MenuLateral, { ItemMenuLateral } from "../menu-lateral";

export default async function PacientesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pacientes, error } = await supabase
    .from("pacientes")
    .select("id, nome, cpf, criado_em")
    .order("criado_em", { ascending: false });

  const itens: ItemMenuLateral[] = [
    {
      tipo: "painel",
      id: "pacientes",
      label: "Pacientes",
      icone: "🧑‍⚕️",
      conteudo: (
        <>
          <h1>Pacientes</h1>
          {error && <p className="erro">Erro ao carregar pacientes: {error.message}</p>}
          <BuscaPacientes pacientes={pacientes ?? []} />
        </>
      ),
    },
    { tipo: "link", id: "agenda", label: "Agenda", icone: "📅", href: "/agenda" },
    { tipo: "link", id: "novo-paciente", label: "Novo paciente", icone: "➕", href: "/pacientes/novo" },
    { tipo: "link", id: "procedimentos", label: "Procedimentos", icone: "🩺", href: "/procedimentos" },
    { tipo: "link", id: "tipos-evento", label: "Tipos de evento", icone: "🗂️", href: "/tipos-evento" },
    { tipo: "link", id: "equipe", label: "Equipe", icone: "👥", href: "/equipe" },
    { tipo: "link", id: "configuracoes", label: "Config.", icone: "⚙️", href: "/configuracoes" },
    { tipo: "acao", id: "sair", label: "Sair", icone: "🚪", conteudo: <BotaoSair /> },
  ];

  return (
    <MenuLateral
      itens={itens}
      itemInicial="pacientes"
      cabecalho={<p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 8 }}>Logado como: {user?.email}</p>}
    />
  );
}
