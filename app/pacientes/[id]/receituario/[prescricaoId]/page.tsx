import { createClient } from "@/lib/supabase/server";
import BotaoImprimir from "./botao-imprimir";

export default async function VisualizarReceitaPage({
  params,
}: {
  params: Promise<{ id: string; prescricaoId: string }>;
}) {
  const { prescricaoId } = await params;
  const supabase = await createClient();

  const { data: prescricao } = await supabase
    .from("prescricoes")
    .select("id, conteudo, criado_em, paciente_id, profissional_id, subtipo_receita")
    .eq("id", prescricaoId)
    .single();

  if (!prescricao) {
    return (
      <div className="container">
        <p>Prescrição não encontrada ou sem permissão de visualização.</p>
      </div>
    );
  }

  const [{ data: paciente }, { data: profissional }, { data: template }, { data: clinica }] =
    await Promise.all([
      supabase.from("pacientes").select("nome").eq("id", prescricao.paciente_id).single(),
      supabase
        .from("usuarios")
        .select("nome, registro_classe, rqe")
        .eq("id", prescricao.profissional_id)
        .single(),
      supabase
        .from("templates_documento")
        .select("titulo_especialidade")
        .eq("profissional_id", prescricao.profissional_id)
        .eq("tipo", "receituario")
        .eq("ativo", true)
        .maybeSingle(),
      supabase.from("clinica_config").select("*").eq("id", 1).single(),
    ]);

  const dataFormatada = new Date(prescricao.criado_em).toLocaleDateString("pt-BR");

  const rotulos: Record<string, string> = {
    simples: "",
    controle_especial: "RECEITUÁRIO DE CONTROLE ESPECIAL",
    antibiotico: "RECEITUÁRIO PARA ANTIBIÓTICO",
  };
  const rotulo = rotulos[prescricao.subtipo_receita ?? "simples"] ?? "";
  const duasVias = prescricao.subtipo_receita === "controle_especial" || prescricao.subtipo_receita === "antibiotico";

  function Folha({ viaLabel }: { viaLabel?: string }) {
    return (
      <div
        className="folha-receituario"
        style={{
          maxWidth: 720,
          margin: "0 auto 32px",
          background: "white",
          padding: "48px 56px",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#1a1a1a",
        }}
      >
        {rotulo && (
          <p
            style={{
              textAlign: "center",
              fontWeight: "bold",
              letterSpacing: 1,
              marginBottom: 16,
              fontSize: "0.9rem",
            }}
          >
            {rotulo}
          </p>
        )}
        {viaLabel && (
          <p style={{ textAlign: "right", fontSize: "0.75rem", color: "#888", margin: 0 }}>
            {viaLabel}
          </p>
        )}

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
          <img src="/logo.png" alt="" style={{ width: 70, height: 70 }} />
          <div>
            <h1 style={{ fontSize: "1.5rem", margin: 0, letterSpacing: 1 }}>
              {profissional?.nome ?? "—"}
            </h1>
            <p style={{ margin: 0, color: "#a07a3f", fontSize: "0.85rem", letterSpacing: 1 }}>
              {template?.titulo_especialidade ?? ""}
            </p>
          </div>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #cbb992", marginBottom: 16 }} />

        <p style={{ textAlign: "center", fontSize: "0.85rem", letterSpacing: 1, margin: 0 }}>
          {profissional?.nome?.toUpperCase()}
        </p>
        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#555", marginTop: 4 }}>
          {profissional?.registro_classe}
          {profissional?.rqe ? ` · ${profissional.rqe}` : ""}
        </p>

        {/* Paciente / Data */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 32,
            marginBottom: 32,
            fontSize: "0.95rem",
          }}
        >
          <span>
            <b>Paciente:</b> {paciente?.nome ?? "—"}
          </span>
          <span>
            <b>Data:</b> {dataFormatada}
          </span>
        </div>

        {/* Corpo */}
        <div style={{ minHeight: 300, whiteSpace: "pre-wrap", fontSize: "1rem", lineHeight: 1.6 }}>
          {prescricao.conteudo}
        </div>

        {/* Assinatura */}
        <div style={{ marginTop: 64, textAlign: "right" }}>
          <div style={{ borderTop: "1px solid #999", display: "inline-block", paddingTop: 4 }}>
            Assinatura e carimbo
          </div>
        </div>

        {/* Rodapé */}
        <hr style={{ border: "none", borderTop: "1px solid #cbb992", margin: "32px 0 12px" }} />
        <p style={{ fontSize: "0.75rem", color: "#666", textAlign: "center", margin: 0 }}>
          {clinica?.endereco}
        </p>
        <p style={{ fontSize: "0.75rem", color: "#666", textAlign: "center", margin: 0 }}>
          {clinica?.telefone} · {clinica?.site} · {clinica?.instagram}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "#f2ede4", minHeight: "100vh", padding: "32px 0" }}>
      {duasVias ? (
        <>
          <Folha viaLabel="1ª via — Farmácia" />
          <Folha viaLabel="2ª via — Paciente" />
        </>
      ) : (
        <Folha />
      )}

      <div style={{ textAlign: "center" }}>
        <BotaoImprimir />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .folha-receituario { box-shadow: none !important; padding: 24px 56px !important; page-break-after: always; }
        }
      `}</style>
    </div>
  );
}
