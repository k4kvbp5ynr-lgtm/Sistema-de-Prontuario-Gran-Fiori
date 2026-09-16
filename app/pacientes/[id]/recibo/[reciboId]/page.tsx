import { createClient } from "@/lib/supabase/server";
import BotaoImprimir from "../../receituario/[prescricaoId]/botao-imprimir";

export default async function VisualizarReciboPage({
  params,
}: {
  params: Promise<{ id: string; reciboId: string }>;
}) {
  const { reciboId } = await params;
  const supabase = await createClient();

  const { data: recibo } = await supabase
    .from("recibos")
    .select("id, tipo, itens, valor_total, criado_em, paciente_id, profissional_id")
    .eq("id", reciboId)
    .single();

  if (!recibo) {
    return (
      <div className="container">
        <p>Recibo não encontrado ou sem permissão de visualização.</p>
      </div>
    );
  }

  const [{ data: paciente }, { data: profissional }, { data: clinica }] = await Promise.all([
    supabase.from("pacientes").select("nome, cpf").eq("id", recibo.paciente_id).single(),
    supabase.from("usuarios").select("nome, registro_classe, rqe").eq("id", recibo.profissional_id).single(),
    supabase.from("clinica_config").select("*").eq("id", 1).single(),
  ]);

  const dataFormatada = new Date(recibo.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const itens = recibo.itens as { nome: string; codigo_tuss: string | null; referencia_cbhpm: string | null; valor: number | null }[];

  const titulo = recibo.tipo === "previa" ? "PRÉVIA DE REEMBOLSO" : "GUIA DE REEMBOLSO";
  const aviso =
    recibo.tipo === "previa"
      ? "Documento de prévia — valores e procedimentos sujeitos a confirmação após a realização."
      : "Documento referente a procedimento(s) já realizado(s), para fins de reembolso junto ao plano de saúde.";

  return (
    <div style={{ background: "var(--cor-fundo-card-alt)", minHeight: "100vh", padding: "32px 0" }}>
      <div
        className="folha-receituario"
        style={{
          maxWidth: 720,
          margin: "0 auto 32px",
          background: "white",
          padding: "48px 56px",
          fontFamily: "var(--fonte-ui), 'Plus Jakarta Sans', -apple-system, sans-serif",
          color: "#1a1a1a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
          <img src="/logo.png" alt="" style={{ width: 70, height: 70 }} />
          <div>
            <h1 style={{ fontSize: "1.3rem", margin: 0, letterSpacing: 1, color: "#1a1a1a" }}>{profissional?.nome ?? "—"}</h1>
            <p style={{ margin: 0, color: "#666", fontSize: "0.85rem" }}>
              {profissional?.registro_classe}
              {profissional?.rqe ? ` · ${profissional.rqe}` : ""}
            </p>
          </div>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #cbb992", marginBottom: 16 }} />

        <p style={{ textAlign: "center", fontWeight: "bold", letterSpacing: 1, margin: "0 0 4px" }}>{titulo}</p>
        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#888", margin: "0 0 24px" }}>{aviso}</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: "0.95rem" }}>
          <span>
            <b>Paciente:</b> {paciente?.nome ?? "—"} {paciente?.cpf ? `— CPF ${paciente.cpf}` : ""}
          </span>
          <span>
            <b>Data:</b> {dataFormatada}
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #999" }}>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>Procedimento</th>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>TUSS</th>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>CBHPM</th>
              <th style={{ textAlign: "right", padding: "6px 4px" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e0d8" }}>
                <td style={{ padding: "6px 4px" }}>{item.nome}</td>
                <td style={{ padding: "6px 4px" }}>{item.codigo_tuss ?? "—"}</td>
                <td style={{ padding: "6px 4px" }}>{item.referencia_cbhpm ?? "—"}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>
                  {item.valor != null
                    ? item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ textAlign: "right", fontWeight: "bold", marginTop: 12, fontSize: "1rem" }}>
          Total:{" "}
          {(recibo.valor_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>

        <div style={{ marginTop: 64, textAlign: "right" }}>
          <div style={{ borderTop: "1px solid #999", display: "inline-block", paddingTop: 4 }}>
            Assinatura e carimbo
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #cbb992", margin: "32px 0 12px" }} />
        <p style={{ fontSize: "0.75rem", color: "#666", textAlign: "center", margin: 0 }}>{clinica?.endereco}</p>
        <p style={{ fontSize: "0.75rem", color: "#666", textAlign: "center", margin: 0 }}>
          {clinica?.telefone} · {clinica?.site} · {clinica?.instagram}
        </p>
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
