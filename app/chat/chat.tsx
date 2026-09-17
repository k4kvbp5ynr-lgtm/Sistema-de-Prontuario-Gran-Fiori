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

export default function Chat({ meuId, altura = "calc(100vh - 120px)" }: { meuId: string; altura?: string }) {
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

  const [buscaContato, setBuscaContato] = useState("");
  const contatosFiltrados = contatos.filter((c) => c.nome.toLowerCase().includes(buscaContato.toLowerCase()));

  function iniciais(nome: string) {
    return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }

  return (
    <div style={{ display: "flex", height: altura, border: "1px solid var(--cor-borda)", borderRadius: 14, overflow: "hidden", background: "var(--cor-fundo-card)" }}>
      <div style={{ width: 236, borderRight: "1px solid var(--cor-borda)", overflowY: "auto", background: "var(--cor-sidebar)" }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: "14px 14px 10px", color: "var(--cor-texto)" }}>Equipe</p>
        <div style={{ padding: "0 14px 10px" }}>
          <input
            value={buscaContato}
            onChange={(e) => setBuscaContato(e.target.value)}
            placeholder="Buscar pessoa"
            style={{ borderRadius: 24, marginBottom: 0 }}
          />
        </div>
        {contatosFiltrados.map((c) => (
          <div
            key={c.id}
            onClick={() => abrirConversa(c)}
            style={{
              padding: "10px 14px",
              cursor: "pointer",
              background: contatoSelecionado?.id === c.id ? "var(--cor-marca-fundo)" : "transparent",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--cor-marca-fundo)",
                  color: "var(--cor-marca-clara)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {iniciais(c.nome)}
              </span>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>{PERFIS[c.perfil] ?? c.perfil}</div>
              </div>
            </div>
            {naoLidas[c.id] > 0 && (
              <span
                style={{
                  background: "var(--cor-marca)",
                  color: "var(--cor-sobre-marca)",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {naoLidas[c.id]}
              </span>
            )}
          </div>
        ))}
        {contatos.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", padding: 12 }}>Nenhum outro usuário ativo.</p>}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!contatoSelecionado ? (
          <p style={{ margin: "auto", color: "var(--cor-texto-fraco)" }}>Escolha uma pessoa pra conversar.</p>
        ) : (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--cor-borda)", display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--cor-marca-fundo)",
                  color: "var(--cor-marca-clara)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {iniciais(contatoSelecionado.nome)}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{contatoSelecionado.nome}</div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {mensagens.map((m) => {
                const minha = m.remetente_id === meuId;
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: minha ? "flex-end" : "flex-start",
                      background: minha ? "var(--cor-marca)" : "var(--cor-fundo-card-alt)",
                      color: minha ? "var(--cor-sobre-marca)" : "var(--cor-texto)",
                      padding: "10px 13px",
                      borderRadius: minha ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      maxWidth: "72%",
                      fontSize: 13,
                    }}
                  >
                    {m.conteudo}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: "right" }}>
                      {new Date(m.criado_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
              <div ref={fimDaListaRef} />
            </div>
            <form onSubmit={enviar} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--cor-borda)" }}>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite uma mensagem..."
                style={{ flex: 1, borderRadius: 24 }}
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
