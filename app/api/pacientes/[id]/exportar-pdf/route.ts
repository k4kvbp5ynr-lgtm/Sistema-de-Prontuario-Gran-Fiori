import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPdfProntuarioCompleto } from "@/lib/pdf/prontuario-completo-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pacienteId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nome, cpf, data_nascimento, sexo, telefone, email, endereco")
    .eq("id", pacienteId)
    .single();

  if (!paciente) {
    return NextResponse.json({ erro: "Paciente não encontrado." }, { status: 404 });
  }

  const [
    { data: alergias },
    { data: medicacoes },
    { data: encontros },
    { data: exames },
    { data: procedimentos },
    { data: escalas },
    { data: avaliacoes },
    { data: receitas },
    { data: relatorios },
    { data: recibos },
  ] = await Promise.all([
    supabase.from("alergias_paciente").select("substancia, reacao, gravidade").eq("paciente_id", pacienteId).eq("ativo", true),
    supabase
      .from("medicacoes_paciente")
      .select("medicamento, dose, frequencia, anticoagulante")
      .eq("paciente_id", pacienteId)
      .eq("ativo", true),
    supabase
      .from("encontros")
      .select("data_hora, evolucoes(motivo_consulta, anamnese, evolucoes_diagnostico(diagnostico_cid, conduta)), usuarios!profissional_id(nome)")
      .eq("paciente_id", pacienteId)
      .order("data_hora", { ascending: false }),
    supabase
      .from("resultados_exames_paciente")
      .select("valor, unidade, status, data_exame, marcadores_exames(nome)")
      .eq("paciente_id", pacienteId)
      .order("data_exame", { ascending: false }),
    supabase
      .from("procedimentos_realizados")
      .select("nome_procedimento, data_procedimento, produto, lote")
      .eq("paciente_id", pacienteId)
      .order("data_procedimento", { ascending: false }),
    supabase
      .from("respostas_escala")
      .select("pontuacao, data_aplicacao, escalas_desfecho(sigla, nome)")
      .eq("paciente_id", pacienteId)
      .order("data_aplicacao", { ascending: false }),
    supabase.from("avaliacoes_fisicas").select("*").eq("paciente_id", pacienteId).order("data_avaliacao", { ascending: false }),
    supabase.from("prescricoes").select("criado_em, subtipo_receita").eq("paciente_id", pacienteId),
    supabase.from("relatorios_medicos").select("criado_em, tipo").eq("paciente_id", pacienteId),
    supabase.from("recibos").select("criado_em, tipo").eq("paciente_id", pacienteId),
  ]);

  const evolucoesFormatadas = (encontros ?? []).flatMap((e: any) =>
    (e.evolucoes ?? []).map((ev: any) => ({
      data_hora: e.data_hora,
      motivo_consulta: ev.motivo_consulta,
      anamnese: ev.anamnese,
      diagnostico_cid: ev.evolucoes_diagnostico?.[0]?.diagnostico_cid ?? null,
      conduta: ev.evolucoes_diagnostico?.[0]?.conduta ?? null,
      profissional_nome: e.usuarios?.nome ?? null,
    }))
  );

  const examesFormatados = (exames ?? []).map((ex: any) => ({
    marcador: ex.marcadores_exames?.nome ?? "—",
    valor: String(ex.valor),
    unidade: ex.unidade,
    status: ex.status,
    data_exame: ex.data_exame,
  }));

  const escalasFormatadas = (escalas ?? []).map((e: any) => ({
    sigla: e.escalas_desfecho?.sigla ?? "—",
    nome: e.escalas_desfecho?.nome ?? "—",
    pontuacao: e.pontuacao,
    data_aplicacao: e.data_aplicacao,
  }));

  const CAMPOS_RESUMO_AVALIACAO: [string, string][] = [
    ["peso_kg", "Peso"],
    ["altura_cm", "Altura"],
    ["imc", "IMC"],
    ["percentual_gordura", "% Gordura"],
    ["massa_magra_kg", "Massa magra"],
    ["vo2_max", "VO2 máx"],
    ["fc_maxima", "FC máxima"],
    ["condicionamento_fisico", "Condicionamento"],
  ];
  const avaliacoesFormatadas = (avaliacoes ?? []).map((a: any) => {
    const partes = CAMPOS_RESUMO_AVALIACAO.filter(([campo]) => a[campo] != null).map(([campo, label]) => `${label}: ${a[campo]}`);
    return { data_avaliacao: a.data_avaliacao, resumo: partes.length > 0 ? partes.join(" · ") : "Registro sem campos preenchidos" };
  });

  const documentos = [
    ...(receitas ?? []).map((r: any) => ({ tipo: "Receita", data: r.criado_em, detalhe: r.subtipo_receita })),
    ...(relatorios ?? []).map((r: any) => ({ tipo: "Relatório médico", data: r.criado_em, detalhe: r.tipo })),
    ...(recibos ?? []).map((r: any) => ({ tipo: "Recibo", data: r.criado_em, detalhe: r.tipo })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  try {
    const pdfBytes = await gerarPdfProntuarioCompleto({
      paciente,
      alergias: alergias ?? [],
      medicacoes: medicacoes ?? [],
      evolucoes: evolucoesFormatadas,
      exames: examesFormatados,
      procedimentos: procedimentos ?? [],
      escalas: escalasFormatadas,
      avaliacoesFisicas: avaliacoesFormatadas,
      documentos,
      geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="prontuario_${paciente.nome.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro ao gerar PDF: " + erro.message }, { status: 500 });
  }
}
