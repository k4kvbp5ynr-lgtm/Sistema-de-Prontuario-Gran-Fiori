import { createClient } from "@/lib/supabase/server";
import Configuracoes from "./configuracoes";
import ConfiguracoesComAbas from "./configuracoes-com-abas";
import CatalogoProcedimentos from "../procedimentos/catalogo-procedimentos";
import TiposEvento from "../tipos-evento/tipos-evento";
import GestaoEquipe from "../equipe/gestao-equipe";
import BuscaPorLote from "./busca-por-lote";
import RecallPacientesInativos from "./recall-pacientes";
import Indicadores from "./indicadores";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: meuUsuario } = user
    ? await supabase.from("usuarios").select("perfil, admin_extra").eq("id", user.id).single()
    : { data: null };

  // Médico não-administrador não acessa Procedimentos / Tipos de evento / Equipe / Rastreabilidade / Recall / Indicadores dentro de Configurações
  const restringirAbas = meuUsuario?.perfil === "medico" && !meuUsuario?.admin_extra;

  const conteudo = (
    <ConfiguracoesComAbas
      assinaturas={<Configuracoes />}
      procedimentos={restringirAbas ? null : <CatalogoProcedimentos />}
      tiposEvento={restringirAbas ? null : <TiposEvento />}
      equipe={restringirAbas ? null : <GestaoEquipe />}
      rastreabilidade={restringirAbas ? null : <BuscaPorLote />}
      recall={restringirAbas ? null : <RecallPacientesInativos />}
      indicadores={restringirAbas ? null : <Indicadores />}
    />
  );
  return <MenuLateral itens={itensMenuPrincipal("configuracoes", conteudo)} itemInicial="configuracoes" />;
}
