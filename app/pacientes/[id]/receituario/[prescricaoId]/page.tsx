import { createClient } from "@/lib/supabase/server";
import BotaoImprimir from "./botao-imprimir";
import BotaoAssinarDigital from "./botao-assinar-digital";

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
      supabase.from("pacientes").select("nome, cpf, endereco, data_nascimento").eq("id", prescricao.paciente_id).single(),
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
  const conteudoPrescricao = prescricao.conteudo;

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
              fontSize: "1rem",
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

        {/* Cabeçalho com logo — aparece sempre */}
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
            marginTop: 32,
            marginBottom: 32,
            fontSize: "0.95rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              <b>Paciente:</b> {paciente?.nome ?? "—"}
            </span>
            <span>
              <b>Data:</b> {dataFormatada}
            </span>
          </div>
          {duasVias && (
            <div style={{ marginTop: 4, fontSize: "0.9rem" }}>
              <p style={{ margin: "2px 0" }}>
                <b>Endereço:</b> {paciente?.endereco || "________________________________"}
              </p>
              <p style={{ margin: "2px 0" }}>
                <b>CPF:</b> {paciente?.cpf || "—"}{" "}
                {paciente?.data_nascimento && (
                  <>
                    &nbsp;·&nbsp;<b>Nascimento:</b>{" "}
                    {new Date(paciente.data_nascimento).toLocaleDateString("pt-BR")}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Corpo */}
        <div style={{ minHeight: duasVias ? 180 : 300, whiteSpace: "pre-wrap", fontSize: "1rem", lineHeight: 1.6 }}>
          {conteudoPrescricao}
        </div>

        {duasVias ? (
          <>
            {/* Identificação do comprador e do fornecedor (preenchimento manual na farmácia) */}
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <div
                style={{
                  flex: 1,
                  border: "1px solid #999",
                  borderRadius: 4,
                  padding: 12,
                  fontSize: "0.8rem",
                }}
              >
                <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>Identificação do comprador</p>
                <p style={{ margin: "10px 0 2px", borderBottom: "1px solid #ccc" }}>Nome:</p>
                <p style={{ margin: "10px 0 2px", borderBottom: "1px solid #ccc" }}>
                  Identificação: &nbsp;&nbsp;&nbsp; Órgão emissor:
                </p>
                <p style={{ margin: "10px 0 2px", borderBottom: "1px solid #ccc" }}>Endereço:</p>
                <p style={{ margin: "10px 0 2px", borderBottom: "1px solid #ccc" }}>
                  Cidade: &nbsp;&nbsp;&nbsp; UF:
                </p>
                <p style={{ margin: "10px 0 2px", borderBottom: "1px solid #ccc" }}>Telefone:</p>
              </div>
              <div
                style={{
                  flex: 1,
                  border: "1px solid #999",
                  borderRadius: 4,
                  padding: 12,
                  fontSize: "0.8rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>Identificação do fornecedor</p>
                <div>
                  <p style={{ margin: "24px 0 2px", borderBottom: "1px solid #ccc" }}>
                    Assinatura do farmacêutico:
                  </p>
                  <p style={{ margin: "16px 0 2px", borderBottom: "1px solid #ccc" }}>
                    Data: ___ / ___ / ___
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 64, textAlign: "right" }}>
            <div style={{ borderTop: "1px solid #999", display: "inline-block", paddingTop: 4 }}>
              Assinatura e carimbo
            </div>
          </div>
        )}

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
        <BotaoAssinarDigital prescricaoId={prescricao.id} />
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
