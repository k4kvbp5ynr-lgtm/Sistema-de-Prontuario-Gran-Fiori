import { createClient } from "@/lib/supabase/server";
import BuscaPacientes from "./busca-pacientes";
import FollowupsPendentes from "./followups-pendentes";
import MenuLateral from "../menu-lateral";
import { itensMenuPrincipal } from "../itens-menu-principal";

function CardMetrica({ label, numero, nota, corNota }: { label: string; numero: number | string; nota?: string; corNota?: string }) {
  return (
    <div style={{ background: "var(--cor-fundo-card)", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: 16 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--cor-texto-fraco)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", fontFamily: "var(--fonte-mono)" }}>{numero}</p>
      {nota && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: corNota ?? "var(--cor-texto-fraco)" }}>{nota}</p>
      )}
    </div>
  );
}

export default async function PacientesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: meuUsuario } = user
    ? await supabase.from("usuarios").select("perfil, admin_extra").eq("id", user.id).single()
    : { data: null };
  const podeVerMetricas = meuUsuario?.perfil === "recepcao" || !!meuUsuario?.admin_extra;

  const { data: pacientes, error } = await supabase
    .from("pacientes")
    .select("id, nome, cpf, criado_em")
    .order("criado_em", { ascending: false });

  let totalPacientes = 0;
  let consultasMes = 0;
  let atendidosHoje = 0;
  let recentes: any[] = [];

  if (podeVerMetricas) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const { count: totalCount } = await supabase.from("pacientes").select("id", { count: "exact", head: true });
    totalPacientes = totalCount ?? 0;

    const { count: consultasCount } = await supabase
      .from("encontros")
      .select("id", { count: "exact", head: true })
      .gte("data_hora", inicioMes.toISOString());
    consultasMes = consultasCount ?? 0;

    const { data: hojeData } = await supabase.from("encontros").select("paciente_id").gte("data_hora", inicioHoje.toISOString());
    atendidosHoje = new Set((hojeData ?? []).map((e) => e.paciente_id)).size;

    const { data: recentesData } = await supabase
      .from("encontros")
      .select("id, data_hora, pacientes(nome), usuarios!profissional_id(nome), evolucoes(motivo_consulta)")
      .order("data_hora", { ascending: false })
      .limit(8);
    recentes = recentesData ?? [];
  } else {
    // Ainda precisamos do total pra mostrar "X de Y" na busca, mesmo sem os outros cards
    const { count: totalCount } = await supabase.from("pacientes").select("id", { count: "exact", head: true });
    totalPacientes = totalCount ?? 0;
  }

  const conteudo = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <BuscaPacientes pacientes={pacientes ?? []} totalPacientes={totalPacientes} />
        </div>
        <a href="/pacientes/novo" style={{ padding: "10px 18px", background: "var(--cor-marca)", color: "var(--cor-sobre-marca)", borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          Novo paciente
        </a>
      </div>

      {error && <p className="erro">Erro ao carregar pacientes: {error.message}</p>}

      <FollowupsPendentes />

      {podeVerMetricas && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 18 }}>
            <CardMetrica label="Total de pacientes" numero={totalPacientes} />
            <CardMetrica label="Consultas este mês" numero={consultasMes} />
            <CardMetrica label="Atendidos hoje" numero={atendidosHoje} />
          </div>

          <div style={{ background: "var(--cor-fundo-card)", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: 16, marginTop: 18 }}>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Atendidos recentemente</p>
            {recentes.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhum atendimento registrado ainda.</p>}
            {recentes.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Motivo</th>
                    <th>Profissional</th>
                    <th>Última consulta</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.pacientes?.nome ?? "—"}</td>
                      <td>{r.evolucoes?.[0]?.motivo_consulta ?? "—"}</td>
                      <td>{r.usuarios?.nome ?? "—"}</td>
                      <td style={{ fontFamily: "var(--fonte-mono)", fontSize: 12 }}>
                        {new Date(r.data_hora).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <p style={{ fontSize: 11, color: "var(--cor-texto-muito-fraco)", marginTop: 12 }}>Logado como: {user?.email}</p>
    </>
  );

  return <MenuLateral itens={itensMenuPrincipal("pacientes", conteudo)} itemInicial="pacientes" />;
}

