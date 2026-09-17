"use client";

export default function ModalDocumento({ href, titulo, onFechar }: { href: string; titulo: string; onFechar: () => void }) {
  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cor-fundo-card)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 820,
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--cor-borda)" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{titulo}</p>
          <button type="button" onClick={onFechar} className="botao-secundario" style={{ fontSize: 12, padding: "4px 12px" }}>
            Fechar ✕
          </button>
        </div>
        <iframe src={href} style={{ flex: 1, border: "none", background: "white" }} title={titulo} />
      </div>
    </div>
  );
}
