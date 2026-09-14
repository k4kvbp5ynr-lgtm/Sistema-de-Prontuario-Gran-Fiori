import TiposEvento from "./tipos-evento";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default function TiposEventoPage() {
  return <MenuLateral itens={itensMenuPrincipal("tipos-evento", <TiposEvento />)} itemInicial="tipos-evento" />;
}
