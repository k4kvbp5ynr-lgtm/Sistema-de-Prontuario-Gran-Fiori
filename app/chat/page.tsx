import { createClient } from "@/lib/supabase/server";
import Chat from "./chat";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p>Sessão expirada. Faça login novamente.</p>;
  }

  return <MenuLateral itens={itensMenuPrincipal("chat", <Chat meuId={user.id} />)} itemInicial="chat" />;
}
