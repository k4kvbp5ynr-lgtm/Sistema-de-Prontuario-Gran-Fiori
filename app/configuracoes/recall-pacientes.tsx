"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Paciente = {
  paciente_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  ultima_consulta: string | null;
  total_consultas: number;
};

export default function RecallPacientesInativos() {
  const supabase = createClient();
  const [meses, setMeses] = useState(6);
  const [cidFiltro, setCidFiltro] = useState("");
  const [lista, setLista] = useState<Paciente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  async function buscar() {
    setBuscando(true);
    const limite = new Date();
    limite.setMonth(limite.getMonth() - meses);

    const { data: todos } = await supabase
      .from("pacientes_ultima_consulta")
      .select("*")
      .order("ultima_consulta", { ascending: true, nullsFirst: true });

    let filtrados = (todos ?? []).filter((p) => !p.ultima_consulta || new Date(p.ultima_consulta) < limite);

    if (cidFiltro.trim()) {
      const { data: comCid } = await supabase
        .from("evolucoes_diagnostico")
        .select("evolucao_id, diagnostico_cid, evolucoes!inner(encontro_id, encontros!inner(paciente_id))")
        .ilike("diagnostico_cid", `%${cidFiltro.trim()}%`);

      const idsComCid = new Set((comCid as any[])?.map((c) => c.evolucoes?.encontros?.paciente_id).filter(Boolean));
      filtrados = filtrados.filter((p) => idsComCid.has(p.paciente_id));
    }

    setLista(filtrados);
    setBuscando(false);
    setBuscou(true);
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function linkWhatsapp(telefone: string, nome: string) {
    const numero = telefone.replace(/\D/g, "");
    const numeroCompleto = numero.startsWith("55") ? numero : `55${numero}`;
    const mensagem = `Olá, ${nome.split(" ")[0]}! Aqui é da Gran Fiori. Faz um tempinho que você não vem à clínica — gostaríamos de saber como você está e ver se é hora de agendar um retorno. Posso te ajudar com isso?`;
    return `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`;
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Recall de pacientes inativos</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>
        Pacientes sem consulta há um tempo — bom ponto de partida pra reengajamento.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11 }}>Sem consulta há pelo menos (meses)</label>
          <input type="number" min={1} value={meses} onChange={(e) => setMeses(Number(e.target.value))} style={{ width: 100 }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 11 }}>Filtrar por diagnóstico/CID (opcional)</label>
          <input value={cidFiltro} onChange={(e) => setCidFiltro(e.target.value)} placeholder="Ex: M54, lombalgia" />
        </div>
        <button type="button" onClick={buscar} disabled={buscando} style={{ fontSize: 12, height: 40 }}>
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {buscou && lista.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)" }}>Nenhum paciente inativo encontrado com esses critérios.</p>}

      {lista.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: "var(--cor-texto-fraco)", margin: "0 0 8px" }}>{lista.length} paciente(s) encontrado(s)</p>
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Telefone</th>
                <th>Última consulta</th>
                <th>Total de consultas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.paciente_id}>
                  <td>
                    <Link href={`/pacientes/${p.paciente_id}`}>{p.nome}</Link>
                  </td>
                  <td>{p.telefone ?? "—"}</td>
                  <td>{p.ultima_consulta ? new Date(p.ultima_consulta).toLocaleDateString("pt-BR") : "Nunca veio"}</td>
                  <td style={{ fontFamily: "var(--fonte-mono)" }}>{p.total_consultas}</td>
                  <td>
                    {p.telefone && (
                      <a href={linkWhatsapp(p.telefone, p.nome)} target="_blank" rel="noreferrer" className="botao-secundario" style={{ fontSize: 11, padding: "4px 10px", textDecoration: "none" }}>
                        WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
