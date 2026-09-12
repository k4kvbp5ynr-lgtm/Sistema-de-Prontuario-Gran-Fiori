import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarReceituarioPDF } from "@/lib/pdf/receituario-pdf";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { senha } = await request.json();

  if (!senha) {
    return NextResponse.json({ erro: "Senha do certificado é obrigatória." }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  // 1. Busca os dados do receituário (RLS garante que só quem tem permissão consegue)
  const { data: prescricao, error: erroPrescricao } = await supabase
    .from("prescricoes")
    .select("id, conteudo, criado_em, paciente_id, profissional_id, subtipo_receita")
    .eq("id", id)
    .single();

  if (erroPrescricao || !prescricao) {
    return NextResponse.json({ erro: "Prescrição não encontrada ou sem permissão." }, { status: 404 });
  }

  const [{ data: paciente }, { data: profissional }, { data: template }, { data: clinica }] = await Promise.all([
    supabase.from("pacientes").select("nome").eq("id", prescricao.paciente_id).single(),
    supabase.from("usuarios").select("nome, registro_classe, rqe, certificado_path").eq("id", user.id).single(),
    supabase
      .from("templates_documento")
      .select("titulo_especialidade")
      .eq("profissional_id", prescricao.profissional_id)
      .eq("tipo", "receituario")
      .eq("ativo", true)
      .maybeSingle(),
    supabase.from("clinica_config").select("*").eq("id", 1).single(),
  ]);

  if (!profissional?.certificado_path) {
    return NextResponse.json(
      { erro: "Você ainda não enviou seu certificado A1 em Configurações." },
      { status: 400 }
    );
  }

  // 2. Baixa o certificado (.pfx) do usuário logado (RLS garante que só o dono acessa)
  const { data: certificadoArquivo, error: erroCertificado } = await supabase.storage
    .from("certificados")
    .download(profissional.certificado_path);

  if (erroCertificado || !certificadoArquivo) {
    return NextResponse.json({ erro: "Não foi possível ler o certificado." }, { status: 500 });
  }

  const p12Buffer = Buffer.from(await certificadoArquivo.arrayBuffer());

  // 3. Gera o PDF do receituário
  const rotulos: Record<string, string> = {
    controle_especial: "RECEITUÁRIO DE CONTROLE ESPECIAL",
    antibiotico: "RECEITUÁRIO PARA ANTIBIÓTICO",
  };

  const pdfBytes = await gerarReceituarioPDF({
    profissionalNome: profissional.nome,
    especialidade: template?.titulo_especialidade ?? "",
    registroClasse: profissional.registro_classe ?? "",
    rqe: profissional.rqe,
    pacienteNome: paciente?.nome ?? "—",
    data: new Date(prescricao.criado_em).toLocaleDateString("pt-BR"),
    conteudo: prescricao.conteudo,
    rotuloTipo: rotulos[prescricao.subtipo_receita ?? ""] ?? null,
    clinicaEndereco: clinica?.endereco ?? "",
    clinicaContato: `${clinica?.telefone ?? ""} · ${clinica?.site ?? ""}`,
  });

  // 4. Assina digitalmente com o certificado A1 (padrão PAdES)
  try {
    const pdfComEspaco = plainAddPlaceholder({
      pdfBuffer: Buffer.from(pdfBytes),
      reason: "Documento assinado digitalmente",
      contactInfo: profissional.nome,
      name: profissional.nome,
    });

    const signer = new P12Signer(p12Buffer, { passphrase: senha });
    const pdfAssinado = await new SignPdf().sign(pdfComEspaco, signer);

    return new NextResponse(pdfAssinado, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receituario_assinado.pdf"`,
      },
    });
  } catch (erro: any) {
    return NextResponse.json(
      { erro: "Não foi possível assinar. Verifique se a senha do certificado está correta. Detalhe: " + erro.message },
      { status: 400 }
    );
  }
}
