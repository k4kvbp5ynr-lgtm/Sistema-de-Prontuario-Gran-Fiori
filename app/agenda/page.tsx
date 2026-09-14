import AgendaCalendario from "./agenda-calendario";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default function AgendaPage() {
  return <MenuLateral itens={itensMenuPrincipal("agenda", <AgendaCalendario />)} itemInicial="agenda" />;
}
