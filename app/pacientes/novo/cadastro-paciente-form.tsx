"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPacienteForm() {
  const router = useRouter();
  const supabase = createClient();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [foto, setFoto] = useState<File | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pesoNum = parseFloat(peso.replace(",", "."));
  const alturaNum = parseFloat(altura.replace(",", "."));
  const imc = pesoNum && alturaNum ? pesoNum / Math.pow(alturaNum / 100, 2) : null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const { data: paciente, error } = await supabase
      .from("pacientes")
      .insert({
        nome,
        cpf: cpf || null,
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        endereco: endereco || null,
        telefone: telefone || null,
        email: email || null,
        peso: peso ? parseFloat(peso.replace(",", ".")) : null,
        altura: altura ? parseFloat(altura.replace(",", ".")) : null,
      })
      .select()
      .single();

    if (error || !paciente) {
      setErro("Não foi possível salvar: " + error?.message);
      setSalvando(false);
      return;
    }

    if (foto) {
      const caminho = `${paciente.id}/foto_${Date.now()}_${foto.name}`;
      const { error: erroUpload } = await supabase.storage.from("fotos-pacientes").upload(caminho, foto);

      if (!erroUpload) {
        await supabase.from("pacientes").update({ foto_path: caminho }).eq("id", paciente.id);
      } else {
        setErro("Paciente salvo, mas houve erro ao enviar a foto: " + erroUpload.message);
      }
    }

    setSalvando(false);
    router.push(`/pacientes/${paciente.id}`);
  }

  function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)", margin: "18px 0 10px" }}>
        {children}
      </p>
    );
  }

  return (
    <form onSubmit={salvar} style={{ padding: "22px 26px", maxWidth: 900 }}>
      <p style={{ fontSize: 12, color: "var(--cor-texto-fraco)", margin: "0 0 4px" }}>Pacientes / Novo</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--cor-texto)" }}>Novo paciente</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/pacientes" className="botao-secundario" style={{ padding: "10px 18px", borderRadius: 20, fontSize: 13, textDecoration: "none", display: "inline-block" }}>
            Cancelar
          </Link>
          <button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar paciente"}
          </button>
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: 18 }}>
        <div>
          <label
            htmlFor="foto-paciente"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 180,
              border: "1px dashed var(--cor-borda-input)",
              borderRadius: 14,
              cursor: "pointer",
              textAlign: "center",
              padding: 12,
            }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--cor-fundo-card-alt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              {foto ? "✓" : "+"}
            </span>
            <span style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>{foto ? foto.name : "Arraste a foto ou clique"}</span>
          </label>
          <input id="foto-paciente" type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} style={{ display: "none" }} />

          <div style={{ background: "var(--cor-fundo-card)", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: 14, marginTop: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cor-texto-fraco)", margin: "0 0 10px" }}>
              Medidas
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>Peso (kg)</label>
                <input value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="72,5" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>Altura (cm)</label>
                <input value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="175" />
              </div>
            </div>
            {imc && (
              <p style={{ fontSize: 12, margin: "6px 0 0" }}>
                IMC: <span style={{ color: "var(--cor-sucesso)", fontWeight: 700, fontFamily: "var(--fonte-mono)" }}>{imc.toFixed(1)}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <Eyebrow>Dados pessoais</Eyebrow>
          <label>Nome completo</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>CPF</label>
              <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Opcional por enquanto" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Data de nascimento</label>
              <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
            </div>
          </div>

          <label>Sexo</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              { valor: "feminino", label: "Feminino" },
              { valor: "masculino", label: "Masculino" },
            ].map((opcao) => {
              const ativo = sexo === opcao.valor;
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => setSexo(opcao.valor)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    background: ativo ? "var(--cor-marca-fundo)" : "transparent",
                    border: ativo ? "1px solid var(--cor-marca)" : "1px solid var(--cor-borda-input)",
                    color: ativo ? "var(--cor-marca-clara)" : "var(--cor-texto-suave)",
                  }}
                >
                  {opcao.label}
                </button>
              );
            })}
          </div>

          <Eyebrow>Contato e endereço</Eyebrow>
          <label>Endereço completo</label>
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Telefone</label>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />
            </div>
            <div style={{ flex: 1 }}>
              <label>E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
