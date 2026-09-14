"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Usuario = { id: string; nome: string; perfil: string; ativo: boolean };
type Mensagem = {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  conteudo: string;
  lida: boolean;
  criado_em: string;
};

const PERFIS: Record<string, string> = {
  recepcao: "Recepção",
  medico: "Médico(a)",
  fisioterapeuta: "Fisioterapeuta",
  enfermagem: "Enfermagem",
  admin: "Admin",
};

export default function Chat({ meuId }: { meuId: string }) {
  const supabase = createClient();
  const [contatos, setContatos] = useState<Usuario[]>([]);
  const [naoLidas, setNaoLidas] = useState<Record<string, number>>({});
  const [contatoSelecionado, setContatoSelecionado] = useState<Usuario | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  async function carregarContatos() {
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome, perfil, ativo")
      .eq("ativo", true)
      .neq("id", meuId)
      .order("nome");
    setContatos(data ?? []);

    const { data: naoLidasData } = await supabase
      .from("mensagens_chat")
      .select("remetente_id")
      .eq("destinatario_id", meuId)
      .eq("lida", false);

    const contagem: Record<string, number> = {};
    for (const m of naoLidasData ?? []) {
      contagem[m.remetente_id] = (contagem[m.remetente_id] ?? 0) + 1;
    }
    setNaoLidas(contagem);
  }

  async function abrirConversa(contato: Usuario) {
    setContatoSelecionado(contato);

    const { data } = await supabase
      .from("mensagens_chat")
      .select("*")
      .or(
        `and(remetente_id.eq.${meuId},destinatario_id.eq.${contato.id}),and(remetente_id.eq.${contato.id},destinatario_id.eq.${meuId})`
      )
      .order("criado_em", { ascending: true });
    setMensagens(data ?? []);

    // marca como lidas as que esse contato me mandou
    await supabase.from("mensagens_chat").update({ lida: true }).eq("remetente_id", contato.id).eq("destinatario_id", meuId).eq("lida", false);
    setNaoLidas((atual) => ({ ...atual, [contato.id]: 0 }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || !contatoSelecionado) return;
    setEnviando(true);

    const { error } = await supabase.from("mensagens_chat").insert({
      remetente_id: meuId,
      destinatario_id: contatoSelecionado.id,
      conteudo: texto.trim(),
    });

    setEnviando(false);
    if (!error) setTexto("");
  }

  useEffect(() => {
    carregarContatos();

    const canal = supabase
      .channel("mensagens_chat_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens_chat" },
        (payload) => {
          const nova = payload.new as Mensagem;
          const ehDestaConversa =
            contatoSelecionadoRef.current &&
            ((nova.remetente_id === meuId && nova.destinatario_id === contatoSelecionadoRef.current.id) ||
              (nova.destinatario_id === meuId && nova.remetente_id === contatoSelecionadoRef.current.id));

          if (ehDestaConversa) {
            setMensagens((atual) => [...atual, nova]);
            if (nova.destinatario_id === meuId) {
              supabase.from("mensagens_chat").update({ lida: true }).eq("id", nova.id).then();
            }
          } else if (nova.destinatario_id === meuId) {
            setNaoLidas((atual) => ({ ...atual, [nova.remetente_id]: (atual[nova.remetente_id] ?? 0) + 1 }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ref auxiliar pra usar o contato selecionado dentro do listener sem recriar o canal toda hora
  const contatoSelecionadoRef = useRef<Usuario | null>(null);
  useEffect(() => {
    contatoSelecionadoRef.current = contatoSelecionado;
  }, [contatoSelecionado]);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", border: "1px solid #e5e0d8", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ width: 220, borderRight: "1px solid #e5e0d8", overflowY: "auto", background: "#fbfaf7" }}>
        {contatos.map((c) => (
          <div
            key={c.id}
            onClick={() => abrirConversa(c)}
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              background: contatoSelecionado?.id === c.id ? "#f0ece2" : "transparent",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: "bold" }}>{c.nome}</div>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>{PERFIS[c.perfil] ?? c.perfil}</div>
            </div>
            {naoLidas[c.id] > 0 && (
              <span
                style={{
                  background: "#b3261e",
                  color: "white",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                }}
              >
                {naoLidas[c.id]}
              </span>
            )}
          </div>
        ))}
        {contatos.length === 0 && <p style={{ fontSize: "0.85rem", color: "#888", padding: 12 }}>Nenhum outro usuário ativo.</p>}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!contatoSelecionado ? (
          <p style={{ margin: "auto", color: "#888" }}>Escolha uma pessoa pra conversar.</p>
        ) : (
          <>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e0d8", fontWeight: "bold" }}>
              {contatoSelecionado.nome}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.remetente_id === meuId ? "flex-end" : "flex-start",
                    background: m.remetente_id === meuId ? "#7a5a2f" : "#f0ece2",
                    color: m.remetente_id === meuId ? "white" : "#333",
                    padding: "8px 12px",
                    borderRadius: 12,
                    maxWidth: "70%",
                    fontSize: "0.9rem",
                  }}
                >
                  {m.conteudo}
                  <div style={{ fontSize: "0.65rem", opacity: 0.7, marginTop: 4 }}>
                    {new Date(m.criado_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
              <div ref={fimDaListaRef} />
            </div>
            <form onSubmit={enviar} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e5e0d8" }}>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite uma mensagem..."
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={!texto.trim() || enviando}>
                Enviar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
