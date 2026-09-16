import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Altera uma evolução clínica SEM perder o registro anterior.
 * Fluxo: guarda um snapshot do estado atual em evolucoes_versoes, só então grava o novo
 * conteúdo. Se o snapshot falhar, a alteração não acontece — nunca se perde o original.
 */
export async function POST(request: NextRequest) {
  const { evolucaoId, motivoAlteracao, campos } = await request.json();

  if (!evolucaoId || !motivoAlteracao?.trim()) {
    return NextResponse.json(
      { erro: "É obrigatório informar o motivo da alteração (exigência de prontuário)." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  // 1. Estado atual (o que vai virar versão histórica)
  const { data: atual, error: erroBusca } = await supabase
    .from("evolucoes")
    .select("id, encontro_id, motivo_consulta, anamnese, exame_fisico, observacoes, versao_atual")
    .eq("id", evolucaoId)
    .single();

  if (erroBusca || !atual) {
    return NextResponse.json({ erro: "Evolução não encontrada." }, { status: 404 });
  }

  const { data: diagAtual } = await supabase
    .from("evolucoes_diagnostico")
    .select("diagnostico_cid, conduta")
    .eq("evolucao_id", evolucaoId)
    .maybeSingle();

  // 2. Guarda o snapshot ANTES de qualquer escrita
  const { error: erroSnapshot } = await supabase.from("evolucoes_versoes").insert({
    evolucao_id: evolucaoId,
    versao: atual.versao_atual,
    motivo_consulta: atual.motivo_consulta,
    anamnese: atual.anamnese,
    exame_fisico: atual.exame_fisico,
    observacoes: atual.observacoes,
    diagnostico_cid: diagAtual?.diagnostico_cid ?? null,
    conduta: diagAtual?.conduta ?? null,
    alterado_por: user.id,
    motivo_alteracao: motivoAlteracao.trim(),
  });

  if (erroSnapshot) {
    return NextResponse.json(
      { erro: "Não foi possível preservar a versão anterior, então a alteração foi cancelada: " + erroSnapshot.message },
      { status: 500 }
    );
  }

  // 3. Só agora grava o novo conteúdo
  const novaVersao = atual.versao_atual + 1;
  const { error: erroUpdate } = await supabase
    .from("evolucoes")
    .update({
      motivo_consulta: campos.motivo_consulta ?? atual.motivo_consulta,
      anamnese: campos.anamnese ?? atual.anamnese,
      exame_fisico: campos.exame_fisico ?? atual.exame_fisico,
      observacoes: campos.observacoes ?? atual.observacoes,
      versao_atual: novaVersao,
      ultima_alteracao_em: new Date().toISOString(),
      ultima_alteracao_por: user.id,
    })
    .eq("id", evolucaoId);

  if (erroUpdate) {
    return NextResponse.json({ erro: "Erro ao salvar a alteração: " + erroUpdate.message }, { status: 500 });
  }

  if (campos.diagnostico_cid !== undefined || campos.conduta !== undefined) {
    if (diagAtual) {
      await supabase
        .from("evolucoes_diagnostico")
        .update({
          diagnostico_cid: campos.diagnostico_cid ?? diagAtual.diagnostico_cid,
          conduta: campos.conduta ?? diagAtual.conduta,
        })
        .eq("evolucao_id", evolucaoId);
    } else {
      await supabase.from("evolucoes_diagnostico").insert({
        evolucao_id: evolucaoId,
        diagnostico_cid: campos.diagnostico_cid ?? null,
        conduta: campos.conduta ?? null,
      });
    }
  }

  // 4. Trilha de auditoria
  const { data: encontro } = await supabase.from("encontros").select("paciente_id").eq("id", atual.encontro_id).single();
  await supabase.from("auditoria_prontuario").insert({
    usuario_id: user.id,
    paciente_id: encontro?.paciente_id ?? null,
    acao: "alterou",
    entidade: "evolucao",
    entidade_id: evolucaoId,
    detalhe: `Versão ${atual.versao_atual} → ${novaVersao}. Motivo: ${motivoAlteracao.trim()}`,
  });

  return NextResponse.json({ ok: true, versao: novaVersao });
}
