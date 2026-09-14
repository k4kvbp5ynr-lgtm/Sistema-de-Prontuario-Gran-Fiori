import GestaoEquipe from "./gestao-equipe";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default function EquipePage() {
  return <MenuLateral itens={itensMenuPrincipal("equipe", <GestaoEquipe />)} itemInicial="equipe" />;
}
