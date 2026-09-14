import CadastroPacienteForm from "./cadastro-paciente-form";
import MenuLateral from "../../menu-lateral";
import { itensMenuPrincipal } from "../../itens-menu-principal";

export default function NovoPacientePage() {
  return <MenuLateral itens={itensMenuPrincipal("novo-paciente", <CadastroPacienteForm />)} itemInicial="novo-paciente" />;
}
