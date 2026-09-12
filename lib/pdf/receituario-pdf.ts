import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export type DadosReceituario = {
  profissionalNome: string;
  especialidade: string;
  registroClasse: string;
  rqe: string | null;
  pacienteNome: string;
  pacienteEndereco?: string | null;
  pacienteCpf?: string | null;
  data: string;
  conteudo: string;
  rotuloTipo: string | null; // ex: "RECEITUÁRIO DE CONTROLE ESPECIAL"
  duasVias: boolean;
  clinicaEndereco: string;
  clinicaContato: string;
  dataAssinatura?: string; // preenchido só quando for assinar
  assinaturaImagemBytes?: Buffer | null;
  cpfAssinante?: string | null; // extraído do certificado A1 no momento da assinatura
  numeroSerieCertificado?: string | null;
};

const DOURADO = rgb(0.63, 0.48, 0.24);
const CINZA = rgb(0.4, 0.4, 0.4);
const PRETO = rgb(0.1, 0.1, 0.1);
const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 56;

function quebrarLinhas(texto: string, largura: number, tamanho: number, fonte: any): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let linhaAtual = "";
    for (const palavra of paragrafo.split(" ")) {
      const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(teste, tamanho) > largura && linhaAtual) {
        linhas.push(linhaAtual);
        linhaAtual = palavra;
      } else {
        linhaAtual = teste;
      }
    }
    linhas.push(linhaAtual);
  }
  return linhas;
}

export async function gerarReceituarioPDF(dados: DadosReceituario): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonteNormal = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logoImagem = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    logoImagem = await pdf.embedPng(logoBytes);
  } catch {
    // segue sem logo se não conseguir ler
  }

  let imagemAssinatura: any = null;
  if (dados.assinaturaImagemBytes) {
    try {
      try {
        imagemAssinatura = await pdf.embedPng(dados.assinaturaImagemBytes);
      } catch {
        imagemAssinatura = await pdf.embedJpg(dados.assinaturaImagemBytes);
      }
    } catch {
      // segue sem imagem de assinatura se não conseguir ler
    }
  }

  function desenharVia(viaLabel: string | null) {
    let pagina = pdf.addPage([LARGURA, ALTURA]);
    let y = 780;

    if (viaLabel) {
      pagina.drawText(dados.rotuloTipo ?? "", {
        x: (LARGURA - fonteNegrito.widthOfTextAtSize(dados.rotuloTipo ?? "", 14)) / 2,
        y,
        size: 14,
        font: fonteNegrito,
        color: PRETO,
      });
      pagina.drawText(viaLabel, {
        x: LARGURA - MARGEM - fonteNormal.widthOfTextAtSize(viaLabel, 9),
        y: y + 18,
        size: 9,
        font: fonteNormal,
        color: CINZA,
      });
      y -= 40;
    }

    const topoCabecalho = y;
    if (logoImagem) {
      const logoTamanho = 46;
      pagina.drawImage(logoImagem, {
        x: MARGEM,
        y: topoCabecalho - logoTamanho + 12,
        width: logoTamanho,
        height: logoTamanho,
      });
    }
    const xTexto = MARGEM + (logoImagem ? 58 : 0);
    pagina.drawText(dados.profissionalNome, { x: xTexto, y: topoCabecalho - 4, size: 15, font: fonteNegrito, color: PRETO });
    pagina.drawText(dados.especialidade, { x: xTexto, y: topoCabecalho - 20, size: 10, font: fonteNormal, color: DOURADO });
    pagina.drawText(`${dados.registroClasse}${dados.rqe ? " · " + dados.rqe : ""}`, {
      x: xTexto,
      y: topoCabecalho - 34,
      size: 8.5,
      font: fonteNormal,
      color: CINZA,
    });

    y = topoCabecalho - 58;
    pagina.drawLine({ start: { x: MARGEM, y }, end: { x: LARGURA - MARGEM, y }, thickness: 0.7, color: DOURADO });
    y -= 24;

    if (!viaLabel && dados.rotuloTipo) {
      const largura = fonteNegrito.widthOfTextAtSize(dados.rotuloTipo, 11);
      pagina.drawText(dados.rotuloTipo, { x: (LARGURA - largura) / 2, y, size: 11, font: fonteNegrito, color: PRETO });
      y -= 20;
    }

    pagina.drawText(`Paciente: ${dados.pacienteNome}`, { x: MARGEM, y, size: 11, font: fonteNormal, color: PRETO });
    pagina.drawText(`Data: ${dados.data}`, {
      x: LARGURA - MARGEM - fonteNormal.widthOfTextAtSize(`Data: ${dados.data}`, 11),
      y,
      size: 11,
      font: fonteNormal,
      color: PRETO,
    });
    y -= 20;

    if (viaLabel) {
      pagina.drawText(`Endereço: ${dados.pacienteEndereco || "________________________________"}`, {
        x: MARGEM,
        y,
        size: 10,
        font: fonteNormal,
        color: PRETO,
      });
      y -= 16;
      pagina.drawText(`CPF: ${dados.pacienteCpf || "—"}`, { x: MARGEM, y, size: 10, font: fonteNormal, color: PRETO });
      y -= 20;
    }

    y -= 8;

    for (const l of quebrarLinhas(dados.conteudo, LARGURA - MARGEM * 2, 11, fonteNormal)) {
      pagina.drawText(l, { x: MARGEM, y, size: 11, font: fonteNormal, color: PRETO });
      y -= 19;
    }

    // Caixas de comprador/fornecedor (só nas receitas de controle especial/antibiótico)
    if (viaLabel) {
      const caixasY = 200;
      const caixaLargura = (LARGURA - MARGEM * 2 - 12) / 2;
      const caixaAltura = 110;

      pagina.drawRectangle({ x: MARGEM, y: caixasY, width: caixaLargura, height: caixaAltura, borderColor: CINZA, borderWidth: 0.7 });
      pagina.drawText("Identificação do comprador", { x: MARGEM + 8, y: caixasY + caixaAltura - 16, size: 9, font: fonteNegrito });
      const linhasComprador = ["Nome:", "Identificação:        Órgão emissor:", "Endereço:", "Cidade:      UF:", "Telefone:"];
      linhasComprador.forEach((l, i) => {
        pagina.drawText(l, { x: MARGEM + 8, y: caixasY + caixaAltura - 34 - i * 15, size: 8.5, font: fonteNormal, color: CINZA });
      });

      const caixaFornecedorX = MARGEM + caixaLargura + 12;
      pagina.drawRectangle({ x: caixaFornecedorX, y: caixasY, width: caixaLargura, height: caixaAltura, borderColor: CINZA, borderWidth: 0.7 });
      pagina.drawText("Identificação do fornecedor", { x: caixaFornecedorX + 8, y: caixasY + caixaAltura - 16, size: 9, font: fonteNegrito });
      pagina.drawText("Assinatura do farmacêutico:", {
        x: caixaFornecedorX + 8,
        y: caixasY + 40,
        size: 8.5,
        font: fonteNormal,
        color: CINZA,
      });
      pagina.drawText("Data: ___ / ___ / ___", {
        x: caixaFornecedorX + 8,
        y: caixasY + 20,
        size: 8.5,
        font: fonteNormal,
        color: CINZA,
      });
    }

    // Carimbo de assinatura digital (aparece em todas as vias, quando assinado)
    if (dados.dataAssinatura) {
      const caixaAltura = 78;
      const caixaLargura = 320;
      const caixaX = LARGURA - MARGEM - caixaLargura;
      const caixaY = 90;

      if (imagemAssinatura) {
        const larguraImg = 130;
        const alturaImg = Math.min((imagemAssinatura.height / imagemAssinatura.width) * larguraImg, 55);
        pagina.drawImage(imagemAssinatura, {
          x: caixaX + (caixaLargura - larguraImg) / 2,
          y: caixaY + caixaAltura + 4,
          width: larguraImg,
          height: alturaImg,
        });
      }

      pagina.drawRectangle({ x: caixaX, y: caixaY, width: caixaLargura, height: caixaAltura, borderColor: DOURADO, borderWidth: 1 });
      pagina.drawText("Documento assinado digitalmente", { x: caixaX + 10, y: caixaY + caixaAltura - 15, size: 8.5, font: fonteNegrito, color: DOURADO });
      pagina.drawText(dados.profissionalNome, { x: caixaX + 10, y: caixaY + caixaAltura - 28, size: 8, font: fonteNormal, color: PRETO });
      pagina.drawText(`${dados.registroClasse}${dados.rqe ? " · " + dados.rqe : ""}`, { x: caixaX + 10, y: caixaY + caixaAltura - 40, size: 7.5, font: fonteNormal, color: CINZA });
      if (dados.cpfAssinante) {
        pagina.drawText(`CPF: ${dados.cpfAssinante}`, { x: caixaX + 10, y: caixaY + caixaAltura - 51, size: 7.5, font: fonteNormal, color: CINZA });
      }
      if (dados.numeroSerieCertificado) {
        pagina.drawText(`Nº série certificado: ${dados.numeroSerieCertificado}`, {
          x: caixaX + 10,
          y: caixaY + caixaAltura - 62,
          size: 7.5,
          font: fonteNormal,
          color: CINZA,
        });
      }
      pagina.drawText(`Assinado em: ${dados.dataAssinatura}`, { x: caixaX + 10, y: caixaY + caixaAltura - 73, size: 7.5, font: fonteNormal, color: CINZA });
    } else if (!viaLabel) {
      pagina.drawText("Assinatura e carimbo", { x: MARGEM, y: 110, size: 9, font: fonteNormal, color: CINZA });
    }

    pagina.drawText(dados.clinicaEndereco, { x: MARGEM, y: 50, size: 8, font: fonteNormal, color: CINZA });
    pagina.drawText(dados.clinicaContato, { x: MARGEM, y: 38, size: 8, font: fonteNormal, color: CINZA });
  }

  if (dados.duasVias) {
    desenharVia("1ª via — Farmácia");
    desenharVia("2ª via — Paciente");
  } else {
    desenharVia(null);
  }

  return pdf.save({ useObjectStreams: false });
}
