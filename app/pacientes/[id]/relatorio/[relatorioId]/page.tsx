import { createClient } from "@/lib/supabase/server";
import BotaoImprimir from "../../receituario/[prescricaoId]/botao-imprimir";
import BotaoVoltarPaciente from "../../../botao-voltar-paciente";

export default async function VisualizarRelatorioPage({
  params,
}: {
  params: Promise<{ id: string; relatorioId: string }>;
}) {
  const { relatorioId } = await params;
  const supabase = await createClient();

  const { data: relatorio } = await supabase
    .from("relatorios_medicos")
    .select("id, tipo, local, dados, procedimentos_tuss, orcamento, criado_em, paciente_id, profissional_id")
    .eq("id", relatorioId)
    .single();

  if (!relatorio) {
    return (
      <div className="container">
        <p>Relatório não encontrado ou sem permissão de visualização.</p>
      </div>
    );
  }

  const [{ data: paciente }, { data: profissional }, { data: template }] = await Promise.all([
    supabase.from("pacientes").select("nome, data_nascimento").eq("id", relatorio.paciente_id).single(),
    supabase.from("usuarios").select("nome, registro_classe, rqe, especialidade").eq("id", relatorio.profissional_id).single(),
    supabase
      .from("templates_documento")
      .select("titulo_especialidade")
      .eq("profissional_id", relatorio.profissional_id)
      .eq("tipo", "receituario")
      .eq("ativo", true)
      .maybeSingle(),
  ]);

  const dataFormatada = new Date(relatorio.criado_em).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const idade = paciente?.data_nascimento
    ? Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const dados = relatorio.dados as any;
  const procedimentos = (relatorio.procedimentos_tuss as any[]) ?? [];
  const orcamento = (relatorio.orcamento as any[]) ?? [];
  const totalOrcamento = orcamento.reduce((soma, o) => soma + (o.valor ?? 0), 0);

  return (
    <div style={{ background: "var(--cor-fundo-card-alt)", minHeight: "100vh", padding: "32px 0" }}>
      <div className="no-print" style={{ maxWidth: 760, margin: "0 auto 12px" }}>
        <BotaoVoltarPaciente pacienteId={relatorio.paciente_id} />
      </div>
      <div
        className="folha-receituario"
        style={{
          maxWidth: 760,
          margin: "0 auto 32px",
          background: "white",
          padding: "48px 56px",
          fontFamily: "var(--fonte-ui), 'Plus Jakarta Sans', -apple-system, sans-serif",
          color: "#1a1a1a",
          fontSize: "0.95rem",
          lineHeight: 1.5,
        }}
      >
        <p style={{ fontWeight: "bold", textAlign: "center", margin: 0 }}>{profissional?.nome?.toUpperCase()}</p>
        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#7a5a2f", margin: "4px 0 24px" }}>
          {template?.titulo_especialidade ?? profissional?.especialidade ?? ""}
        </p>

        <p style={{ fontWeight: "bold", textAlign: "center", margin: "0 0 16px" }}>
          {relatorio.tipo === "regiao_unica" ? "RELATÓRIO MÉDICO" : "SOLICITAÇÃO DE PROCEDIMENTOS / INFILTRAÇÕES ARTICULARES"}
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: "0.9rem" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: 6, fontWeight: "bold" }}>Paciente</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{paciente?.nome?.toUpperCase()}</td>
            </tr>
            {idade != null && (
              <tr>
                <td style={{ border: "1px solid #ccc", padding: 6, fontWeight: "bold" }}>Idade</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{idade} anos</td>
              </tr>
            )}
            <tr>
              <td style={{ border: "1px solid #ccc", padding: 6, fontWeight: "bold" }}>
                {relatorio.tipo === "regiao_unica" ? "Exame de referência" : "Exames de referência"}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>
                {relatorio.tipo === "regiao_unica" ? dados.exame_referencia : dados.exames_referencia}
              </td>
            </tr>
          </tbody>
        </table>

        {relatorio.tipo === "regiao_unica" ? (
          <>
            <p style={{ fontWeight: "bold" }}>SÍNTESE CLÍNICA E RADIOLÓGICA</p>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{dados.sintese}</p>

            <p style={{ fontWeight: "bold" }}>HIPÓTESES DIAGNÓSTICAS</p>
            <ul style={{ marginBottom: 16 }}>
              {(dados.hipoteses ?? "")
                .split("\n")
                .filter((l: string) => l.trim())
                .map((l: string, i: number) => (
                  <li key={i}>{l}</li>
                ))}
            </ul>

            <p style={{ fontWeight: "bold" }}>PROPOSTA TERAPÊUTICA</p>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{dados.proposta}</p>

            {dados.fundamentacao && (
              <p style={{ marginBottom: 16 }}>
                <b>Fundamentação:</b> {dados.fundamentacao}
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ fontWeight: "bold" }}>JUSTIFICATIVA CLÍNICA GERAL</p>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{dados.justificativa_geral}</p>

            {dados.regioes?.map((r: any, i: number) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: "bold" }}>
                  {i + 1}. {r.titulo?.toUpperCase()} — SOLICITAÇÃO DE INFILTRAÇÃO INTRA-ARTICULAR
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>{r.sintese}</p>
                {r.repercussao && <p style={{ whiteSpace: "pre-wrap" }}>{r.repercussao}</p>}
                {r.testes && (
                  <>
                    <p style={{ fontWeight: "bold", fontSize: "0.9rem", marginBottom: 4 }}>
                      Testes semiológicos a documentar no exame físico, se efetivamente positivos:
                    </p>
                    <p style={{ whiteSpace: "pre-wrap" }}>{r.testes}</p>
                  </>
                )}
                {r.solicito && (
                  <p>
                    <b>Solicito:</b> {r.solicito}
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        {procedimentos.length > 0 && (
          <>
            <p style={{ fontWeight: "bold" }}>CÓDIGOS TUSS — PROCEDIMENTOS SOLICITADOS</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #999" }}>
                  <th style={{ textAlign: "left", padding: 6 }}>Código TUSS</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Procedimento</th>
                  <th style={{ textAlign: "left", padding: 6 }}>CBHPM</th>
                </tr>
              </thead>
              <tbody>
                {procedimentos.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e0d8" }}>
                    <td style={{ padding: 6 }}>{p.codigo_tuss ?? "—"}</td>
                    <td style={{ padding: 6 }}>{p.nome}</td>
                    <td style={{ padding: 6 }}>{p.referencia_cbhpm ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {orcamento.length > 0 && (
          <>
            <p style={{ fontWeight: "bold" }}>ORÇAMENTO DO TRATAMENTO</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #999" }}>
                  <th style={{ textAlign: "left", padding: 6 }}>Item</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Referência</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {orcamento.map((o, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e0d8" }}>
                    <td style={{ padding: 6 }}>{o.item}</td>
                    <td style={{ padding: 6 }}>{o.referencia}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>
                      {o.valor != null ? o.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: 6, fontWeight: "bold" }} colSpan={2}>
                    TOTAL
                  </td>
                  <td style={{ padding: 6, fontWeight: "bold", textAlign: "right" }}>
                    {totalOrcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: 48, textAlign: "center" }}>
          <p style={{ borderTop: "1px solid #999", display: "inline-block", paddingTop: 4, margin: "24px 0 4px" }}>
            {profissional?.nome}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>
            {template?.titulo_especialidade ?? profissional?.especialidade ?? ""}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: "4px 0 0" }}>
            {profissional?.registro_classe}
            {profissional?.rqe ? ` · ${profissional.rqe}` : ""}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#666", marginTop: 16 }}>
            {relatorio.local}, {dataFormatada}.
          </p>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <BotaoImprimir />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .folha-receituario { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
