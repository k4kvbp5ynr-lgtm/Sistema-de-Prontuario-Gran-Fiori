import { createClient } from "@/lib/supabase/server";
import AgendaCalendario from "./agenda-calendario";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

const PERFIS_CURTOS: Record<string, string> = {
  medico: "Dr(a).",
  fisioterapeuta: "Fisio.",
  enfermagem: "Enf.",
};

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: profissionais } = await supabase
    .from("usuarios")
    .select("nome, perfil, cor_agenda")
    .in("perfil", ["medico", "fisioterapeuta", "enfermagem"])
    .eq("ativo", true)
    .order("nome");

  const extraSidebar = profissionais && profissionais.length > 0 && (
    <div style={{ marginTop: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)", margin: "0 0 8px 8px" }}>
        Profissionais
      </p>
      {profissionais.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.cor_agenda ?? "var(--cor-marca)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--cor-texto-suave)" }}>{p.nome}</span>
        </div>
      ))}
    </div>
  );

  return <MenuLateral itens={itensMenuPrincipal("agenda", <AgendaCalendario />)} itemInicial="agenda" extraSidebar={extraSidebar} />;
}
