"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Configuracoes() {
  const supabase = createClient();

  // assinatura pessoal
  const [assinaturaPath, setAssinaturaPath] = useState<string | null>(null);
  const [assinaturaUrl, setAssinaturaUrl] = useState<string | null>(null);
  const [novaAssinatura, setNovaAssinatura] = useState<File | null>(null);
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState<string | null>(null);

  // BirdID (só admin)
  const [ehAdmin, setEhAdmin] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [birdidAtivo, setBirdidAtivo] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [salvandoBirdid, setSalvandoBirdid] = useState(false);
  const [erroBirdid, setErroBirdid] = useState<string | null>(null);

  async function carregar() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: meuUsuario } = await supabase
      .from("usuarios")
      .select("assinatura_path")
      .eq("id", user.id)
      .single();

    if (meuUsuario?.assinatura_path) {
      setAssinaturaPath(meuUsuario.assinatura_path);
      const { data } = await supabase.storage
        .from("assinaturas")
        .createSignedUrl(meuUsuario.assinatura_path, 300);
      if (data) setAssinaturaUrl(data.signedUrl);
    }

    const { data: birdid, error } = await supabase.from("birdid_config").select("*").eq("id", 1).single();
    if (!error && birdid) {
      setEhAdmin(true);
      setClientId(birdid.client_id ?? "");
      setClientSecret(birdid.client_secret ?? "");
      setBirdidAtivo(birdid.ativo);
      setObservacoes(birdid.observacoes ?? "");
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvarAssinatura(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAssinatura) return;
    setErroAssinatura(null);
    setSalvandoAssinatura(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErroAssinatura("Sessão expirada.");
      setSalvandoAssinatura(false);
      return;
    }

    const caminho = `${user.id}/assinatura_${Date.now()}_${novaAssinatura.name}`;

    const { error: erroUpload } = await supabase.storage.from("assinaturas").upload(caminho, novaAssinatura);
    if (erroUpload) {
      setErroAssinatura("Erro ao enviar: " + erroUpload.message);
      setSalvandoAssinatura(false);
      return;
    }

    const { error: erroFuncao } = await supabase.rpc("atualizar_minha_assinatura", { p_caminho: caminho });

    setSalvandoAssinatura(false);

    if (erroFuncao) {
      setErroAssinatura("Erro ao salvar: " + erroFuncao.message);
      return;
    }

    setNovaAssinatura(null);
    carregar();
  }

  async function salvarBirdid(e: React.FormEvent) {
    e.preventDefault();
    setErroBirdid(null);
    setSalvandoBirdid(true);

    const { error } = await supabase
      .from("birdid_config")
      .update({
        client_id: clientId || null,
        client_secret: clientSecret || null,
        ativo: birdidAtivo,
        observacoes: observacoes || null,
      })
      .eq("id", 1);

    setSalvandoBirdid(false);

    if (error) {
      setErroBirdid("Erro ao salvar: " + error.message);
    }
  }

  return (
    <div className="container">
      <h1>Configurações</h1>

      <h2 style={{ fontSize: "1.1rem" }}>Minha assinatura</h2>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Uma imagem da sua assinatura (foto ou digitalização), usada como referência visual nos documentos.
        Isso não substitui a assinatura digital com validade jurídica (ICP-Brasil/BirdID) — é só a
        representação visual.
      </p>

      {assinaturaUrl && (
        <img
          src={assinaturaUrl}
          alt="Assinatura atual"
          style={{ maxWidth: 240, maxHeight: 100, display: "block", marginBottom: 12, background: "#fbfaf7", padding: 8 }}
        />
      )}

      <form onSubmit={salvarAssinatura} style={{ marginBottom: 32 }}>
        {erroAssinatura && <p className="erro">{erroAssinatura}</p>}
        <input type="file" accept="image/*" onChange={(e) => setNovaAssinatura(e.target.files?.[0] ?? null)} />
        <button type="submit" disabled={!novaAssinatura || salvandoAssinatura} style={{ marginTop: 8 }}>
          {salvandoAssinatura ? "Enviando..." : "Salvar assinatura"}
        </button>
      </form>

      {ehAdmin && (
        <>
          <h2 style={{ fontSize: "1.1rem" }}>Assinatura eletrônica (BirdID)</h2>
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Guarde aqui as credenciais da sua conta BirdID Pro (Client ID e Client Secret) quando você tiver
            uma. A chamada de assinatura de verdade nos documentos será construída depois, usando essas
            credenciais — por enquanto elas só ficam guardadas com segurança (visíveis só para
            administradores).
          </p>
          <form onSubmit={salvarBirdid} style={{ maxWidth: 480 }}>
            {erroBirdid && <p className="erro">{erroBirdid}</p>}
            <label>Client ID</label>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} />
            <label>Client Secret</label>
            <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={birdidAtivo}
                onChange={(e) => setBirdidAtivo(e.target.checked)}
                style={{ width: "auto" }}
              />
              BirdID ativo (credenciais já configuradas e prontas para uso)
            </label>
            <label>Observações</label>
            <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            <button type="submit" disabled={salvandoBirdid} style={{ marginTop: 12 }}>
              {salvandoBirdid ? "Salvando..." : "Salvar configuração do BirdID"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
