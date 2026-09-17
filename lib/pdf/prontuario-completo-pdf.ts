import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";

const PRETO = rgb(0.1, 0.1, 0.1);
const CINZA = rgb(0.4, 0.4, 0.4);
const TEAL = rgb(0.114, 0.361, 0.341); // #1d5c57
const VERMELHO = rgb(0.64, 0.14, 0.11);
const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 50;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

function quebrarLinhas(texto: string, largura: number, tamanho: number, fonte: any): string[] {
  const linhas: string[] = [];
  for (const paragrafo of (texto ?? "").split("\n")) {
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

export type DadosProntuarioCompleto = {
  paciente: {
    nome: string;
    cpf: string | null;
    data_nascimento: string | null;
    sexo: string | null;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
  };
  alergias: { substancia: string; reacao: string | null; gravidade: string | null }[];
  medicacoes: { medicamento: string; dose: string | null; frequencia: string | null; anticoagulante: boolean }[];
  evolucoes: {
    data_hora: string;
    motivo_consulta: string | null;
    anamnese: string | null;
    diagnostico_cid: string | null;
    conduta: string | null;
    profissional_nome: string | null;
  }[];
  exames: { marcador: string; valor: string; unidade: string | null; status: string | null; data_exame: string }[];
  procedimentos: { nome_procedimento: string; data_procedimento: string; produto: string | null; lote: string | null }[];
  escalas: { sigla: string; nome: string; pontuacao: number; data_aplicacao: string }[];
  avaliacoesFisicas: { data_avaliacao: string; resumo: string }[];
  documentos: { tipo: string; data: string; detalhe: string | null }[];
  geradoEm: string;
};

class Escritor {
  doc: PDFDocument;
  pagina!: PDFPage;
  y: number = 0;
  fonteNormal: any;
  fonteNegrito: any;

  constructor(doc: PDFDocument, fonteNormal: any, fonteNegrito: any) {
    this.doc = doc;
    this.fonteNormal = fonteNormal;
    this.fonteNegrito = fonteNegrito;
  }

  novaPagina() {
    this.pagina = this.doc.addPage([LARGURA, ALTURA]);
    this.y = ALTURA - MARGEM;
  }

  garantirEspaco(altura: number) {
    if (this.y - altura < MARGEM + 30) {
      this.novaPagina();
    }
  }

  titulo(texto: string) {
    this.garantirEspaco(40);
    this.pagina.drawText(texto, { x: MARGEM, y: this.y, size: 18, font: this.fonteNegrito, color: TEAL });
    this.y -= 26;
  }

  secao(texto: string) {
    this.garantirEspaco(30);
    this.y -= 6;
    this.pagina.drawLine({ start: { x: MARGEM, y: this.y }, end: { x: LARGURA - MARGEM, y: this.y }, thickness: 0.7, color: TEAL });
    this.y -= 16;
    this.pagina.drawText(texto.toUpperCase(), { x: MARGEM, y: this.y, size: 11, font: this.fonteNegrito, color: TEAL });
    this.y -= 16;
  }

  paragrafo(texto: string, opcoes: { negrito?: boolean; cor?: any; tamanho?: number } = {}) {
    const tamanho = opcoes.tamanho ?? 10;
    const fonte = opcoes.negrito ? this.fonteNegrito : this.fonteNormal;
    const linhas = quebrarLinhas(texto, LARGURA_UTIL, tamanho, fonte);
    for (const linha of linhas) {
      this.garantirEspaco(tamanho + 4);
      this.pagina.drawText(linha, { x: MARGEM, y: this.y, size: tamanho, font: fonte, color: opcoes.cor ?? PRETO });
      this.y -= tamanho + 4;
    }
  }

  campoLinha(label: string, valor: string) {
    this.garantirEspaco(14);
    this.pagina.drawText(label + ": ", { x: MARGEM, y: this.y, size: 10, font: this.fonteNegrito, color: PRETO });
    const larguraLabel = this.fonteNegrito.widthOfTextAtSize(label + ": ", 10);
    this.pagina.drawText(valor || "—", { x: MARGEM + larguraLabel, y: this.y, size: 10, font: this.fonteNormal, color: PRETO });
    this.y -= 15;
  }

  espaco(altura = 8) {
    this.y -= altura;
  }

  semDados(texto = "Nenhum registro.") {
    this.paragrafo(texto, { cor: CINZA });
  }
}

export async function gerarPdfProntuarioCompleto(dados: DadosProntuarioCompleto): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonteNormal = await doc.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Escritor(doc, fonteNormal, fonteNegrito);
  w.novaPagina();

  w.titulo("Prontuário Eletrônico Completo");
  w.paragrafo(`Gerado em ${dados.geradoEm}`, { tamanho: 9, cor: CINZA });
  w.espaco(10);

  w.secao("Dados do paciente");
  w.campoLinha("Nome", dados.paciente.nome);
  w.campoLinha("CPF", dados.paciente.cpf ?? "—");
  w.campoLinha(
    "Data de nascimento",
    dados.paciente.data_nascimento ? new Date(dados.paciente.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"
  );
  w.campoLinha("Sexo", dados.paciente.sexo ?? "—");
  w.campoLinha("Telefone", dados.paciente.telefone ?? "—");
  w.campoLinha("E-mail", dados.paciente.email ?? "—");
  w.campoLinha("Endereço", dados.paciente.endereco ?? "—");
  w.espaco(6);

  w.secao("Segurança clínica — Alergias");
  if (dados.alergias.length === 0) {
    w.semDados("Nenhuma alergia registrada.");
  } else {
    for (const a of dados.alergias) {
      w.paragrafo(`• ${a.substancia}${a.reacao ? ` — reação: ${a.reacao}` : ""}${a.gravidade ? ` (gravidade: ${a.gravidade})` : ""}`, {
        cor: a.gravidade === "grave" ? VERMELHO : PRETO,
      });
    }
  }
  w.espaco(4);

  w.secao("Segurança clínica — Medicações em uso");
  if (dados.medicacoes.length === 0) {
    w.semDados("Nenhuma medicação em uso registrada.");
  } else {
    for (const m of dados.medicacoes) {
      w.paragrafo(
        `• ${m.medicamento}${m.dose ? ` ${m.dose}` : ""}${m.frequencia ? ` — ${m.frequencia}` : ""}${
          m.anticoagulante ? " [ANTICOAGULANTE/ANTIAGREGANTE]" : ""
        }`,
        { cor: m.anticoagulante ? VERMELHO : PRETO }
      );
    }
  }
  w.espaco(6);

  w.secao("Histórico de consultas");
  if (dados.evolucoes.length === 0) {
    w.semDados();
  } else {
    for (const ev of dados.evolucoes) {
      w.garantirEspaco(20);
      w.paragrafo(
        `${new Date(ev.data_hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${
          ev.profissional_nome ? ` — ${ev.profissional_nome}` : ""
        }`,
        { negrito: true, tamanho: 10.5 }
      );
      if (ev.motivo_consulta) w.paragrafo(`Motivo: ${ev.motivo_consulta}`);
      if (ev.anamnese) w.paragrafo(`Anamnese: ${ev.anamnese}`);
      if (ev.diagnostico_cid) w.paragrafo(`Diagnóstico: ${ev.diagnostico_cid}`);
      if (ev.conduta) w.paragrafo(`Conduta: ${ev.conduta}`);
      w.espaco(8);
    }
  }

  w.secao("Exames laboratoriais");
  if (dados.exames.length === 0) {
    w.semDados();
  } else {
    for (const ex of dados.exames) {
      const cor = ex.status === "acima" ? VERMELHO : ex.status === "abaixo" ? rgb(0.6, 0.45, 0.1) : PRETO;
      w.paragrafo(
        `${new Date(ex.data_exame + "T00:00:00").toLocaleDateString("pt-BR")} — ${ex.marcador}: ${ex.valor}${
          ex.unidade ? ` ${ex.unidade}` : ""
        }${ex.status && ex.status !== "normal" ? ` (${ex.status})` : ""}`,
        { cor, tamanho: 9.5 }
      );
    }
  }
  w.espaco(6);

  w.secao("Procedimentos realizados");
  if (dados.procedimentos.length === 0) {
    w.semDados();
  } else {
    for (const p of dados.procedimentos) {
      w.paragrafo(
        `${new Date(p.data_procedimento + "T00:00:00").toLocaleDateString("pt-BR")} — ${p.nome_procedimento}${
          p.produto ? ` (${p.produto}${p.lote ? `, lote ${p.lote}` : ""})` : ""
        }`
      );
    }
  }
  w.espaco(6);

  w.secao("Escalas de desfecho");
  if (dados.escalas.length === 0) {
    w.semDados();
  } else {
    for (const e of dados.escalas) {
      w.paragrafo(`${new Date(e.data_aplicacao + "T00:00:00").toLocaleDateString("pt-BR")} — ${e.sigla} (${e.nome}): ${e.pontuacao}`);
    }
  }
  w.espaco(6);

  w.secao("Avaliações físicas");
  if (dados.avaliacoesFisicas.length === 0) {
    w.semDados();
  } else {
    for (const a of dados.avaliacoesFisicas) {
      w.paragrafo(`${new Date(a.data_avaliacao + "T00:00:00").toLocaleDateString("pt-BR")} — ${a.resumo}`, { tamanho: 9.5 });
    }
  }
  w.espaco(6);

  w.secao("Documentos emitidos");
  if (dados.documentos.length === 0) {
    w.semDados();
  } else {
    for (const d of dados.documentos) {
      w.paragrafo(`${new Date(d.data).toLocaleDateString("pt-BR")} — ${d.tipo}${d.detalhe ? ` (${d.detalhe})` : ""}`);
    }
  }

  return doc.save();
}
