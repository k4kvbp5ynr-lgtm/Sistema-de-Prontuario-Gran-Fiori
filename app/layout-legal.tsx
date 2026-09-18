import { ReactNode } from "react";

export default function LayoutLegal({ titulo, atualizadoEm, children }: { titulo: string; atualizadoEm: string; children: ReactNode }) {
  return (
    <div style={{ background: "#f4f6f6", minHeight: "100vh", padding: "0 0 80px" }}>
      <div style={{ background: "#0b1214", padding: "24px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
          <div>
            <p style={{ margin: 0, color: "#f2f6f5", fontWeight: 700, fontSize: 15 }}>Gran Fiori Wellness Clinic</p>
            <p style={{ margin: 0, color: "#8fa19e", fontSize: 12 }}>Sistema de Prontuário Eletrônico</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px", background: "white", borderRadius: 14, marginTop: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0b1214", margin: "0 0 6px" }}>{titulo}</h1>
        <p style={{ fontSize: 13, color: "#6b7776", margin: "0 0 32px" }}>Última atualização: {atualizadoEm}</p>
        <div
          style={{
            fontSize: 14.5,
            lineHeight: 1.75,
            color: "#242e2d",
          }}
        >
          {children}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "24px auto 0", padding: "0 24px", textAlign: "center" }}>
        <a href="/" style={{ fontSize: 12, color: "#6b7776" }}>
          ← Voltar ao sistema
        </a>
      </div>
    </div>
  );
}
