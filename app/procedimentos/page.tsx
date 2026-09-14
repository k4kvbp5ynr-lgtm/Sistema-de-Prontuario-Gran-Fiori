import CatalogoProcedimentos from "./catalogo-procedimentos";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default function ProcedimentosPage() {
  return <MenuLateral itens={itensMenuPrincipal("procedimentos", <CatalogoProcedimentos />)} itemInicial="procedimentos" />;
}
