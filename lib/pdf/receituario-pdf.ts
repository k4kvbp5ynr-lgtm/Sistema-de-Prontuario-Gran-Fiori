import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
};

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
  let pagina = pdf.addPage([595.28, 841.89]); // A4
  const fonteNormal = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margem = 56;
  let y = 780;

  function linha(texto: string, tamanho = 11, fonte = fonteNormal, cor = rgb(0.1, 0.1, 0.1)) {
    if (y < 80) {
      pagina = pdf.addPage([595.28, 841.89]);
      y = 780;
    }
    pagina.drawText(texto, { x: margem, y, size: tamanho, font: fonte, color: cor });
    y -= tamanho + 8;
  }

  function linhaCentralizada(texto: string, tamanho = 11, fonte = fonteNormal) {
    const largura = fonte.widthOfTextAtSize(texto, tamanho);
    const x = (595.28 - largura) / 2;
    if (y < 80) {
      pagina = pdf.addPage([595.28, 841.89]);
      y = 780;
    }
    pagina.drawText(texto, { x, y, size: tamanho, font: fonte });
    y -= tamanho + 8;
  }

  // Cabeçalho
  linhaCentralizada(dados.profissionalNome.toUpperCase(), 13, fonteNegrito);
  linhaCentralizada(dados.especialidade, 10);
  linhaCentralizada(`${dados.registroClasse}${dados.rqe ? " · " + dados.rqe : ""}`, 9);
  y -= 10;

  if (dados.rotuloTipo) {
    linhaCentralizada(dados.rotuloTipo, 11, fonteNegrito);
    y -= 6;
  }

  linha(`Paciente: ${dados.pacienteNome}`, 11);
  linha(`Data: ${dados.data}`, 11);
  y -= 10;

  // Corpo (com quebra de linha automática)
  for (const l of quebrarLinhas(dados.conteudo, 595.28 - margem * 2, 11, fonteNormal)) {
    linha(l, 11);
  }

  y -= 40;
  linha("Assinatura e carimbo", 9, fonteNormal, rgb(0.4, 0.4, 0.4));

  // Rodapé (na última página usada)
  pagina.drawText(dados.clinicaEndereco, {
    x: margem,
    y: 50,
    size: 8,
    font: fonteNormal,
    color: rgb(0.4, 0.4, 0.4),
  });
  pagina.drawText(dados.clinicaContato, {
    x: margem,
    y: 38,
    size: 8,
    font: fonteNormal,
    color: rgb(0.4, 0.4, 0.4),
  });

  return pdf.save();
}
