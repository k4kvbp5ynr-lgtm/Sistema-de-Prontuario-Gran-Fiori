"use client";

import { useEffect, useState, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";

type Pendente = { id: string; email: string; criado_em: string };
type Usuario = {
  id: string;
  nome: string;
  perfil: string;
  registro_classe: string | null;
  rqe: string | null;
  especialidade: string | null;
  admin_extra: boolean;
  ativo: boolean;
  cor_agenda: string;
  pode_usar_ia: boolean;
};

const PERFIS: Record<string, string> = {
  recepcao: "Recepção",
  medico: "Médico(a)",
  fisioterapeuta: "Fisioterapeuta",
  enfermagem: "Enfermagem",
  admin: "Admin (sem função clínica)",
};

export default function GestaoEquipe() {
  const supabase = createClient();
  const [carregando, setCarregando] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // formulário de completar cadastro / editar
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState("recepcao");
  const [registroClasse, setRegistroClasse] = useState("");
  const [rqe, setRqe] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [adminExtra, setAdminExtra] = useState(false);
  const [corAgenda, setCorAgenda] = useState("#7a5a2f");
  const [podeUsarIA, setPodeUsarIA] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // criar novo usuário direto pelo sistema
  const [mostrarCriarUsuario, setMostrarCriarUsuario] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [erroCriarUsuario, setErroCriarUsuario] = useState<string | null>(null);

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setErroCriarUsuario(null);
    setCriandoUsuario(true);

    try {
      const resposta = await fetch("/api/equipe/criar-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: novoEmail, senha: novaSenha }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErroCriarUsuario(dados.erro ?? "Erro ao criar usuário.");
        setCriandoUsuario(false);
        return;
      }

      setNovoEmail("");
      setNovaSenha("");
      setMostrarCriarUsuario(false);
      setCriandoUsuario(false);
      carregar();
    } catch {
      setErroCriarUsuario("Erro de conexão.");
      setCriandoUsuario(false);
    }
  }

  async function carregar() {
    setCarregando(true);
    const { data: pend, error: erroPend } = await supabase.rpc("usuarios_pendentes");

    if (erroPend) {
      setSemPermissao(true);
      setCarregando(false);
      return;
    }

    setPendentes(pend ?? []);

    const { data: users } = await supabase
      .from("usuarios")
      .select("id, nome, perfil, registro_classe, rqe, especialidade, admin_extra, ativo, cor_agenda, pode_usar_ia")
      .order("nome");

    setUsuarios(users ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirFormulario(id: string, emailSugerido: string) {
    setEditandoUsuarioId(null);
    setIdSelecionado(id);
    setNome("");
    setPerfil("recepcao");
    setRegistroClasse("");
    setRqe("");
    setEspecialidade("");
    setAdminExtra(false);
    setCorAgenda("#7a5a2f");
    setErro(null);
  }

  function abrirEdicao(usuario: Usuario) {
    setIdSelecionado(null);
    setEditandoUsuarioId(usuario.id);
    setNome(usuario.nome);
    setPerfil(usuario.perfil);
    setRegistroClasse(usuario.registro_classe ?? "");
    setRqe(usuario.rqe ?? "");
    setEspecialidade(usuario.especialidade ?? "");
    setAdminExtra(usuario.admin_extra);
    setCorAgenda(usuario.cor_agenda ?? "#7a5a2f");
    setPodeUsarIA(usuario.pode_usar_ia ?? false);
    setErro(null);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoUsuarioId) return;
    setErro(null);
    setSalvando(true);

    const { error } = await supabase
      .from("usuarios")
      .update({
        nome,
        perfil,
        registro_classe: registroClasse || null,
        rqe: rqe || null,
        especialidade: especialidade || null,
        admin_extra: adminExtra,
        cor_agenda: corAgenda,
        pode_usar_ia: podeUsarIA,
      })
      .eq("id", editandoUsuarioId);

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setEditandoUsuarioId(null);
    carregar();
  }

  async function completarCadastro(e: React.FormEvent) {
    e.preventDefault();
    if (!idSelecionado) return;
    setErro(null);
    setSalvando(true);

    const { error } = await supabase.from("usuarios").insert({
      id: idSelecionado,
      nome,
      perfil,
      registro_classe: registroClasse || null,
      rqe: rqe || null,
      especialidade: especialidade || null,
      admin_extra: adminExtra,
      cor_agenda: corAgenda,
      pode_usar_ia: podeUsarIA,
    });

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    setIdSelecionado(null);
    carregar();
  }

  async function alternarAtivo(usuario: Usuario) {
    await supabase.from("usuarios").update({ ativo: !usuario.ativo }).eq("id", usuario.id);
    carregar();
  }

  if (carregando) return <p className="container">Carregando...</p>;

  if (semPermissao) {
    return (
      <div className="container">
        <p>Apenas administradores podem acessar a gestão de equipe.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Equipe</h1>

      <h2 style={{ fontSize: "1.1rem" }}>Equipe atual</h2>
      <table style={{ tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "24%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Nome</th>
            <th style={{ textAlign: "left" }}>Perfil</th>
            <th style={{ textAlign: "left" }}>Registro</th>
            <th>Admin</th>
            <th>Cor</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <Fragment key={u.id}>
              <tr>
                <td>{u.nome}</td>
                <td>{PERFIS[u.perfil] ?? u.perfil}</td>
                <td>
                  {u.registro_classe}
                  {u.rqe ? ` · ${u.rqe}` : ""}
                </td>
                <td style={{ textAlign: "center" }}>{u.admin_extra || u.perfil === "admin" ? "Sim" : "—"}</td>
                <td style={{ textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: u.cor_agenda ?? "#7a5a2f",
                    }}
                  />
                </td>
                <td style={{ textAlign: "center" }}>{u.ativo ? "Ativo" : "Inativo"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => abrirEdicao(u)} style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                    Editar
                  </button>
                  <button type="button" onClick={() => alternarAtivo(u)} style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                    {u.ativo ? "Desativar" : "Reativar"}
                  </button>
                  </div>
                </td>
              </tr>
              {editandoUsuarioId === u.id && (
                <tr>
                  <td colSpan={7}>
                    <form onSubmit={salvarEdicao} style={{ margin: "8px 0", maxWidth: 420 }}>
                      {erro && <p className="erro">{erro}</p>}
                      <label>Nome completo</label>
                      <input value={nome} onChange={(e) => setNome(e.target.value)} required />

                      <label>Perfil</label>
                      <select
                        value={perfil}
                        onChange={(e) => setPerfil(e.target.value)}
                        style={{ padding: 8, width: "100%", marginBottom: 12 }}
                      >
                        {Object.entries(PERFIS).map(([chave, label]) => (
                          <option key={chave} value={chave}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <label>Registro de classe (CRM/CREFITO/COREN)</label>
                      <input value={registroClasse} onChange={(e) => setRegistroClasse(e.target.value)} />

                      <label>RQE (se houver)</label>
                      <input value={rqe} onChange={(e) => setRqe(e.target.value)} />

                      <label>Especialidade</label>
                      <input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />

                      <label>Cor na agenda</label>
                      <input
                        type="color"
                        value={corAgenda}
                        onChange={(e) => setCorAgenda(e.target.value)}
                        style={{ width: 60, height: 36, padding: 2, marginBottom: 8 }}
                      />

                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input
                          type="checkbox"
                          checked={adminExtra}
                          onChange={(e) => setAdminExtra(e.target.checked)}
                          style={{ width: "auto" }}
                        />
                        Também terá poderes de administrador
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input
                          type="checkbox"
                          checked={podeUsarIA}
                          onChange={(e) => setPodeUsarIA(e.target.checked)}
                          style={{ width: "auto" }}
                        />
                        🤖 Pode usar as ferramentas de IA (extração de exames, sugestão diagnóstica, etc.)
                      </label>

                      <button type="submit" disabled={salvando} style={{ marginTop: 12, marginRight: 8 }}>
                        {salvando ? "Salvando..." : "Salvar alterações"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoUsuarioId(null)}
                        style={{ background: "transparent", color: "#666" }}
                      >
                        Cancelar
                      </button>
                    </form>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Adicionar novo membro à equipe</h2>

      {!mostrarCriarUsuario ? (
        <button type="button" onClick={() => setMostrarCriarUsuario(true)}>
          + Criar novo usuário
        </button>
      ) : (
        <form onSubmit={criarUsuario} style={{ maxWidth: 380, marginBottom: 16 }}>
          {erroCriarUsuario && <p className="erro">{erroCriarUsuario}</p>}
          <label>E-mail</label>
          <input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} required />
          <label>Senha temporária</label>
          <input
            type="text"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />
          <p style={{ fontSize: "0.8rem", color: "#666" }}>
            Depois de criado, o login aparece logo abaixo em "Logins pendentes" pra você completar o cadastro.
            Passe essa senha pra pessoa e peça pra trocar assim que entrar.
          </p>
          <button type="submit" disabled={criandoUsuario} style={{ marginRight: 8 }}>
            {criandoUsuario ? "Criando..." : "Criar login"}
          </button>
          <button
            type="button"
            onClick={() => setMostrarCriarUsuario(false)}
            style={{ background: "transparent", color: "#666" }}
          >
            Cancelar
          </button>
        </form>
      )}

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Logins pendentes de cadastro</h2>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Logins criados (por aqui ou direto no Supabase) que ainda não têm perfil completo aparecem abaixo.
      </p>

      {pendentes.length === 0 && <p>Nenhum login pendente no momento.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {pendentes.map((p) => (
          <li key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #e5e0d8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{p.email}</span>
              <button type="button" onClick={() => abrirFormulario(p.id, p.email)}>
                Completar cadastro
              </button>
            </div>

            {idSelecionado === p.id && (
              <form onSubmit={completarCadastro} style={{ marginTop: 12, maxWidth: 420 }}>
                {erro && <p className="erro">{erro}</p>}
                <label>Nome completo</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required />

                <label>Perfil</label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  style={{ padding: 8, width: "100%", marginBottom: 12 }}
                >
                  {Object.entries(PERFIS).map(([chave, label]) => (
                    <option key={chave} value={chave}>
                      {label}
                    </option>
                  ))}
                </select>

                <label>Registro de classe (CRM/CREFITO/COREN)</label>
                <input value={registroClasse} onChange={(e) => setRegistroClasse(e.target.value)} />

                <label>RQE (se houver)</label>
                <input value={rqe} onChange={(e) => setRqe(e.target.value)} />

                <label>Especialidade</label>
                <input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />

                <label>Cor na agenda</label>
                <input
                  type="color"
                  value={corAgenda}
                  onChange={(e) => setCorAgenda(e.target.value)}
                  style={{ width: 60, height: 36, padding: 2, marginBottom: 8 }}
                />

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={adminExtra}
                    onChange={(e) => setAdminExtra(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  Também terá poderes de administrador
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={podeUsarIA}
                    onChange={(e) => setPodeUsarIA(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  🤖 Pode usar as ferramentas de IA (extração de exames, sugestão diagnóstica, etc.)
                </label>

                <button type="submit" disabled={salvando} style={{ marginTop: 12, marginRight: 8 }}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setIdSelecionado(null)}
                  style={{ background: "transparent", color: "#666" }}
                >
                  Cancelar
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
