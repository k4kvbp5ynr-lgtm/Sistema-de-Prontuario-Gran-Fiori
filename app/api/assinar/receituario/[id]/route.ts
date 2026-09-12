import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarReceituarioPDF } from "@/lib/pdf/receituario-pdf";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import forge from "node-forge";

export const runtime = "nodejs";

function extrairDadosCertificado(p12Buffer: Buffer, senha: string) {
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = bags[forge.pki.oids.certBag]?.[0];
  const cert = certBag?.cert;

  if (!cert) {
    throw new Error("Certificado não encontrado no arquivo.");
  }

  const cn = cert.subject.getField("CN")?.value ?? "";
  // Certificados e-CPF da ICP-Brasil usam o padrão "NOME COMPLETO:CPF" no campo CN
  const partesCn = cn.split(":");
  const cpf = partesCn.length > 1 ? partesCn[partesCn.length - 1] : null;

  return {
    cpf,
    numeroSerie: cert.serialNumber,
  };
}

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

  const { data: prescricao, error: erroPrescricao } = await supabase
    .from("prescricoes")
    .select("id, conteudo, criado_em, paciente_id, profissional_id, subtipo_receita")
    .eq("id", id)
    .single();

  if (erroPrescricao || !prescricao) {
    return NextResponse.json({ erro: "Prescrição não encontrada ou sem permissão." }, { status: 404 });
  }

  const [{ data: paciente }, { data: profissional }, { data: template }, { data: clinica }] = await Promise.all([
    supabase.from("pacientes").select("nome, cpf, endereco").eq("id", prescricao.paciente_id).single(),
    supabase.from("usuarios").select("nome, registro_classe, rqe, certificado_path, assinatura_path").eq("id", user.id).single(),
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

  const { data: certificadoArquivo, error: erroCertificado } = await supabase.storage
    .from("certificados")
    .download(profissional.certificado_path);

  if (erroCertificado || !certificadoArquivo) {
    return NextResponse.json({ erro: "Não foi possível ler o certificado." }, { status: 500 });
  }

  const p12Buffer = Buffer.from(await certificadoArquivo.arrayBuffer());

  // Extrai CPF e número de série do certificado ANTES de gerar o PDF, para exibir no carimbo visível.
  // Isso também serve como primeira checagem de senha — se a senha estiver errada, falha aqui.
  let dadosCertificado: { cpf: string | null; numeroSerie: string };
  try {
    dadosCertificado = extrairDadosCertificado(p12Buffer, senha);
  } catch (erro: any) {
    return NextResponse.json(
      { erro: "Não foi possível ler o certificado. Verifique se a senha está correta." },
      { status: 400 }
    );
  }

  let assinaturaImagemBytes: Buffer | null = null;
  if (profissional.assinatura_path) {
    const { data: arquivoAssinatura } = await supabase.storage.from("assinaturas").download(profissional.assinatura_path);
    if (arquivoAssinatura) {
      assinaturaImagemBytes = Buffer.from(await arquivoAssinatura.arrayBuffer());
    }
  }

  const rotulos: Record<string, string> = {
    controle_especial: "RECEITUÁRIO DE CONTROLE ESPECIAL",
    antibiotico: "RECEITUÁRIO PARA ANTIBIÓTICO",
  };
  const duasVias = prescricao.subtipo_receita === "controle_especial" || prescricao.subtipo_receita === "antibiotico";

  const pdfBytes = await gerarReceituarioPDF({
    profissionalNome: profissional.nome,
    especialidade: template?.titulo_especialidade ?? "",
    registroClasse: profissional.registro_classe ?? "",
    rqe: profissional.rqe,
    pacienteNome: paciente?.nome ?? "—",
    pacienteEndereco: paciente?.endereco,
    pacienteCpf: paciente?.cpf,
    data: new Date(prescricao.criado_em).toLocaleDateString("pt-BR"),
    conteudo: prescricao.conteudo,
    rotuloTipo: rotulos[prescricao.subtipo_receita ?? ""] ?? null,
    duasVias,
    clinicaEndereco: clinica?.endereco ?? "",
    clinicaContato: `${clinica?.telefone ?? ""} · ${clinica?.site ?? ""}`,
    dataAssinatura: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    assinaturaImagemBytes,
    cpfAssinante: dadosCertificado.cpf,
    numeroSerieCertificado: dadosCertificado.numeroSerie,
  });

  try {
    const pdfComEspaco = plainAddPlaceholder({
      pdfBuffer: Buffer.from(pdfBytes),
      reason: "Documento assinado digitalmente",
      contactInfo: profissional.nome,
      name: profissional.nome,
      location: clinica?.endereco ?? "Brasil",
    });

    const signer = new P12Signer(p12Buffer, { passphrase: senha });
    const pdfAssinado = await new SignPdf().sign(pdfComEspaco, signer);

    // Guarda uma cópia do PDF assinado e gera um link temporário para compartilhar com o paciente
    const caminhoDocumento = `${prescricao.paciente_id}/${prescricao.id}_${Date.now()}.pdf`;

    const { error: erroUpload } = await supabase.storage
      .from("documentos-assinados")
      .upload(caminhoDocumento, pdfAssinado, { contentType: "application/pdf" });

    if (erroUpload) {
      return NextResponse.json(
        { erro: "Documento assinado, mas houve erro ao gerar o link: " + erroUpload.message },
        { status: 500 }
      );
    }

    const { data: linkAssinado, error: erroLink } = await supabase.storage
      .from("documentos-assinados")
      .createSignedUrl(caminhoDocumento, 60 * 60 * 24 * 7); // válido por 7 dias

    if (erroLink || !linkAssinado) {
      return NextResponse.json({ erro: "Documento assinado, mas houve erro ao gerar o link." }, { status: 500 });
    }

    return NextResponse.json({ url: linkAssinado.signedUrl });
  } catch (erro: any) {
    return NextResponse.json(
      { erro: "Não foi possível assinar. Verifique se a senha do certificado está correta. Detalhe: " + erro.message },
      { status: 400 }
    );
  }
}
