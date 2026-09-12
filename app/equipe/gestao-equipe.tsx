"use client";

import { useEffect, useState } from "react";
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

  // formulário de completar cadastro
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState("recepcao");
  const [registroClasse, setRegistroClasse] = useState("");
  const [rqe, setRqe] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [adminExtra, setAdminExtra] = useState(false);
  const [salvando, setSalvando] = useState(false);

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
      .select("id, nome, perfil, registro_classe, rqe, especialidade, admin_extra, ativo")
      .order("nome");

    setUsuarios(users ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirFormulario(id: string, emailSugerido: string) {
    setIdSelecionado(id);
    setNome("");
    setPerfil("recepcao");
    setRegistroClasse("");
    setRqe("");
    setEspecialidade("");
    setAdminExtra(false);
    setErro(null);
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
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Perfil</th>
            <th>Registro</th>
            <th>Admin</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td>{PERFIS[u.perfil] ?? u.perfil}</td>
              <td>
                {u.registro_classe}
                {u.rqe ? ` · ${u.rqe}` : ""}
              </td>
              <td>{u.admin_extra || u.perfil === "admin" ? "Sim" : "—"}</td>
              <td>{u.ativo ? "Ativo" : "Inativo"}</td>
              <td>
                <button type="button" onClick={() => alternarAtivo(u)} style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                  {u.ativo ? "Desativar" : "Reativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Logins pendentes de cadastro</h2>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Para adicionar alguém à equipe: primeiro crie o login da pessoa no Supabase
        (Authentication → Users → Add user). Depois de criado, o login aparece aqui
        pra você completar o cadastro (nome, perfil, registro de classe).
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

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={adminExtra}
                    onChange={(e) => setAdminExtra(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  Também terá poderes de administrador
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
