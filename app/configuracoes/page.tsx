import Configuracoes from "./configuracoes";
import ConfiguracoesComAbas from "./configuracoes-com-abas";
import CatalogoProcedimentos from "../procedimentos/catalogo-procedimentos";
import TiposEvento from "../tipos-evento/tipos-evento";
import GestaoEquipe from "../equipe/gestao-equipe";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default function ConfiguracoesPage() {
  const conteudo = (
    <ConfiguracoesComAbas
      assinaturas={<Configuracoes />}
      procedimentos={<CatalogoProcedimentos />}
      tiposEvento={<TiposEvento />}
      equipe={<GestaoEquipe />}
    />
  );
  return <MenuLateral itens={itensMenuPrincipal("configuracoes", conteudo)} itemInicial="configuracoes" />;
}
