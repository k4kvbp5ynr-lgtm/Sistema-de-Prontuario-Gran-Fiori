import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export type DadosReceituario = {
  profissionalNome: string;
  especialidade: string;
  registroClasse: string;
  rqe: string | null;
  pacienteNome: string;
  data: string;
  conteudo: string;
  rotuloTipo: string | null; // ex: "RECEITUÁRIO DE CONTROLE ESPECIAL"
  clinicaEndereco: string;
  clinicaContato: string;
  dataAssinatura?: string; // data/hora exibida no carimbo visível (preenchido só quando for assinar)
  assinaturaImagemBytes?: Buffer | null; // imagem da assinatura pessoal (PNG ou JPEG)
};

const DOURADO = rgb(0.63, 0.48, 0.24); // aprox. #a07a3f
const CINZA = rgb(0.4, 0.4, 0.4);
const PRETO = rgb(0.1, 0.1, 0.1);

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
  const larguraPagina = 595.28;
  const alturaPagina = 841.89;
  let pagina = pdf.addPage([larguraPagina, alturaPagina]);
  const fonteNormal = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margem = 56;
  let y = 780;
  const topoCabecalho = y;

  // Logo (mesma imagem usada na tela)
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    const logoImagem = await pdf.embedPng(logoBytes);
    const logoTamanho = 46;
    pagina.drawImage(logoImagem, {
      x: margem,
      y: topoCabecalho - logoTamanho + 12,
      width: logoTamanho,
      height: logoTamanho,
    });
  } catch {
    // se o logo não puder ser lido, segue sem ele
  }

  const xTextoCabecalho = margem + 58;
  pagina.drawText(dados.profissionalNome, {
    x: xTextoCabecalho,
    y: topoCabecalho - 4,
    size: 15,
    font: fonteNegrito,
    color: PRETO,
  });
  pagina.drawText(dados.especialidade, {
    x: xTextoCabecalho,
    y: topoCabecalho - 20,
    size: 10,
    font: fonteNormal,
    color: DOURADO,
  });
  pagina.drawText(`${dados.registroClasse}${dados.rqe ? " · " + dados.rqe : ""}`, {
    x: xTextoCabecalho,
    y: topoCabecalho - 34,
    size: 8.5,
    font: fonteNormal,
    color: CINZA,
  });

  y = topoCabecalho - 58;

  pagina.drawLine({
    start: { x: margem, y },
    end: { x: larguraPagina - margem, y },
    thickness: 0.7,
    color: DOURADO,
  });
  y -= 24;

  function linha(texto: string, tamanho = 11, fonte = fonteNormal, cor = PRETO) {
    if (y < 140) {
      pagina = pdf.addPage([larguraPagina, alturaPagina]);
      y = 780;
    }
    pagina.drawText(texto, { x: margem, y, size: tamanho, font: fonte, color: cor });
    y -= tamanho + 8;
  }

  function linhaCentralizada(texto: string, tamanho = 11, fonte = fonteNormal, cor = PRETO) {
    const largura = fonte.widthOfTextAtSize(texto, tamanho);
    const x = (larguraPagina - largura) / 2;
    if (y < 140) {
      pagina = pdf.addPage([larguraPagina, alturaPagina]);
      y = 780;
    }
    pagina.drawText(texto, { x, y, size: tamanho, font: fonte, color: cor });
    y -= tamanho + 8;
  }

  if (dados.rotuloTipo) {
    linhaCentralizada(dados.rotuloTipo, 11, fonteNegrito);
    y -= 6;
  }

  linha(`Paciente: ${dados.pacienteNome}`, 11);
  linha(`Data: ${dados.data}`, 11);
  y -= 10;

  for (const l of quebrarLinhas(dados.conteudo, larguraPagina - margem * 2, 11, fonteNormal)) {
    linha(l, 11);
  }

  // Carimbo visível de assinatura (canto inferior direito)
  const paginas = pdf.getPages();
  const ultimaPagina = paginas[paginas.length - 1];

  if (dados.dataAssinatura) {
    const caixaAltura = 70;
    const caixaLargura = 320;
    const caixaX = larguraPagina - margem - caixaLargura;
    const caixaY = 90;

    // Imagem da assinatura pessoal (se houver), desenhada acima da caixa do carimbo
    if (dados.assinaturaImagemBytes) {
      try {
        let imagemAssinatura;
        try {
          imagemAssinatura = await pdf.embedPng(dados.assinaturaImagemBytes);
        } catch {
          imagemAssinatura = await pdf.embedJpg(dados.assinaturaImagemBytes);
        }
        const larguraImg = 140;
        const alturaImg = (imagemAssinatura.height / imagemAssinatura.width) * larguraImg;
        ultimaPagina.drawImage(imagemAssinatura, {
          x: caixaX + (caixaLargura - larguraImg) / 2,
          y: caixaY + caixaAltura + 4,
          width: larguraImg,
          height: Math.min(alturaImg, 60),
        });
      } catch {
        // se a imagem não puder ser lida, segue sem ela
      }
    }

    ultimaPagina.drawRectangle({
      x: caixaX,
      y: caixaY,
      width: caixaLargura,
      height: caixaAltura,
      borderColor: DOURADO,
      borderWidth: 1,
    });

    ultimaPagina.drawText("Documento assinado digitalmente", {
      x: caixaX + 10,
      y: caixaY + caixaAltura - 16,
      size: 8.5,
      font: fonteNegrito,
      color: DOURADO,
    });
    ultimaPagina.drawText(dados.profissionalNome, {
      x: caixaX + 10,
      y: caixaY + caixaAltura - 30,
      size: 8.5,
      font: fonteNormal,
      color: PRETO,
    });
    ultimaPagina.drawText(`${dados.registroClasse}${dados.rqe ? " · " + dados.rqe : ""}`, {
      x: caixaX + 10,
      y: caixaY + caixaAltura - 42,
      size: 8,
      font: fonteNormal,
      color: CINZA,
    });
    ultimaPagina.drawText(`Assinado em: ${dados.dataAssinatura}`, {
      x: caixaX + 10,
      y: caixaY + caixaAltura - 54,
      size: 8,
      font: fonteNormal,
      color: CINZA,
    });
  } else {
    y -= 40;
    linha("Assinatura e carimbo", 9, fonteNormal, CINZA);
  }

  // Rodapé (em todas as páginas)
  for (const p of pdf.getPages()) {
    p.drawText(dados.clinicaEndereco, { x: margem, y: 50, size: 8, font: fonteNormal, color: CINZA });
    p.drawText(dados.clinicaContato, { x: margem, y: 38, size: 8, font: fonteNormal, color: CINZA });
  }

  return pdf.save({ useObjectStreams: false });
}
