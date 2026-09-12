"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CATEGORIAS: Record<string, string> = {
  medicacao: "Medicação",
  pedido_exame: "Pedido de exame",
  orientacao_pos_procedimento: "Orientações para procedimentos (pré e pós)",
  atestado_padrao: "Atestado padrão",
  pacote_exames: "Pacote de exames",
};

type Item = {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
};

export default function ModelosSalvos({
  conteudoAtual,
  onInserir,
}: {
  conteudoAtual: string;
  onInserir: (texto: string) => void;
}) {
  const supabase = createClient();
  const [itens, setItens] = useState<Item[]>([]);
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("medicacao");
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("itens_salvos")
      .select("id, categoria, titulo, conteudo")
      .eq("profissional_id", user.id)
      .order("titulo");

    setItens(data ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvarModelo() {
    if (!novoTitulo.trim() || !conteudoAtual.trim()) {
      setErro("Escreva o conteúdo no campo da prescrição antes de salvar como modelo.");
      return;
    }
    setErro(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("itens_salvos").insert({
      profissional_id: user.id,
      categoria: novaCategoria,
      titulo: novoTitulo,
      conteudo: conteudoAtual,
    });

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setNovoTitulo("");
    setMostrarNovo(false);
    carregar();
  }

  async function remover(id: string) {
    await supabase.from("itens_salvos").delete().eq("id", id);
    carregar();
  }

  return (
    <div
      style={{
        border: "1px solid #e5e0d8",
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        background: "#fbfaf7",
      }}
    >
      <p style={{ fontWeight: "bold", margin: "0 0 8px" }}>Modelos salvos</p>

      {Object.entries(CATEGORIAS).map(([chave, label]) => {
        const itensDaCategoria = itens.filter((i) => i.categoria === chave);
        const aberta = categoriaAberta === chave;
        return (
          <div key={chave} style={{ marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => setCategoriaAberta(aberta ? null : chave)}
              style={{
                background: "transparent",
                color: "#7a5a2f",
                padding: "4px 0",
                fontWeight: "bold",
                fontSize: "0.9rem",
              }}
            >
              {aberta ? "▾" : "▸"} {label} ({itensDaCategoria.length})
            </button>
            {aberta && (
              <ul style={{ listStyle: "none", paddingLeft: 16, margin: "4px 0" }}>
                {itensDaCategoria.length === 0 && (
                  <li style={{ fontSize: "0.85rem", color: "#888" }}>Nenhum modelo salvo ainda.</li>
                )}
                {itensDaCategoria.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.9rem",
                      padding: "3px 0",
                    }}
                  >
                    <span>{item.titulo}</span>
                    <span>
                      <button
                        type="button"
                        onClick={() => onInserir(item.conteudo)}
                        style={{ fontSize: "0.75rem", padding: "3px 8px", marginRight: 6 }}
                      >
                        Inserir
                      </button>
                      <button
                        type="button"
                        onClick={() => remover(item.id)}
                        style={{
                          fontSize: "0.75rem",
                          padding: "3px 8px",
                          background: "transparent",
                          color: "#b3261e",
                        }}
                      >
                        remover
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #e5e0d8" }} />

      {!mostrarNovo ? (
        <button type="button" onClick={() => setMostrarNovo(true)} style={{ fontSize: "0.85rem" }}>
          + Salvar texto atual como modelo
        </button>
      ) : (
        <div>
          {erro && <p className="erro">{erro}</p>}
          <select
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            style={{ marginBottom: 8, padding: 6, width: "100%" }}
          >
            {Object.entries(CATEGORIAS).map(([chave, label]) => (
              <option key={chave} value={chave}>
                {label}
              </option>
            ))}
          </select>
          <input
            placeholder="Nome do modelo (ex: Dipirona 500mg padrão)"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <button type="button" onClick={salvarModelo} style={{ marginRight: 8 }}>
            Salvar modelo
          </button>
          <button
            type="button"
            onClick={() => setMostrarNovo(false)}
            style={{ background: "transparent", color: "#666" }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
