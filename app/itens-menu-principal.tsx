import { ReactNode } from "react";
import BotaoSair from "./pacientes/botao-sair";
import { ItemMenuLateral } from "./menu-lateral";

const PAGINAS = [
  { id: "pacientes", label: "Pacientes", icone: "🧑‍⚕️", href: "/pacientes" },
  { id: "agenda", label: "Agenda", icone: "📅", href: "/agenda" },
  { id: "novo-paciente", label: "Novo paciente", icone: "➕", href: "/pacientes/novo" },
  { id: "chat", label: "Chat", icone: "💬", href: "/chat" },
  { id: "configuracoes", label: "Configurações", icone: "⚙️", href: "/configuracoes" },
];

export function itensMenuPrincipal(paginaAtual: string, conteudoAtual: ReactNode): ItemMenuLateral[] {
  return [
    ...PAGINAS.map((p): ItemMenuLateral =>
      p.id === paginaAtual
        ? { tipo: "painel", id: p.id, label: p.label, icone: p.icone, conteudo: conteudoAtual }
        : { tipo: "link", id: p.id, label: p.label, icone: p.icone, href: p.href }
    ),
    { tipo: "acao", id: "sair", label: "Sair", icone: "🚪", conteudo: <BotaoSair /> },
  ];
}
