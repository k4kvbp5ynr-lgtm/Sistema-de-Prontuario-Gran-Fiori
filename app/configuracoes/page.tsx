import Configuracoes from "./configuracoes";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default function ConfiguracoesPage() {
  return <MenuLateral itens={itensMenuPrincipal("configuracoes", <Configuracoes />)} itemInicial="configuracoes" />;
}
