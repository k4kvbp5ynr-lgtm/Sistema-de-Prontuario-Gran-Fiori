import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// SNPedia guarda cada combinação SNP+genótipo como uma página própria,
// ex: "Rs7412(C;C)". Convenção deles: primeira letra do rsid maiúscula.
function tituloDaPagina(rsid: string, genotipo: string): string {
  const rsidNormalizado = "Rs" + rsid.replace(/^rs/i, "");
  return `${rsidNormalizado}(${genotipo})`;
}

function extrairCampo(wikitext: string, campo: string): string | null {
  const regex = new RegExp(`\\|\\s*${campo}\\s*=\\s*([^\\n|]+)`, "i");
  const match = wikitext.match(regex);
  return match ? match[1].trim() : null;
}

export async function POST(request: NextRequest) {
  const { pacienteId, rsid, genotipo } = await request.json();

  if (!rsid || !genotipo) {
    return NextResponse.json({ erro: "Informe o rsid e o genótipo." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const titulo = tituloDaPagina(rsid, genotipo);
  const url = `https://bots.snpedia.com/api.php?action=query&titles=${encodeURIComponent(
    titulo
  )}&prop=revisions&rvprop=content&format=json`;

  try {
    const resposta = await fetch(url, {
      headers: {
        // Boa prática pedida pelo próprio SNPedia: identificar o script que está consultando
        "User-Agent": "ProntuarioGranFiori/1.0 (uso clínico interno)",
      },
    });

    if (!resposta.ok) {
      return NextResponse.json({ erro: "Erro ao consultar o SNPedia." }, { status: 502 });
    }

    const dados = await resposta.json();
    const paginas = dados?.query?.pages ?? {};
    const primeiraPagina: any = Object.values(paginas)[0];

    if (!primeiraPagina || primeiraPagina.missing !== undefined) {
      return NextResponse.json({
        encontrado: false,
        mensagem: `Não há registro no SNPedia para ${titulo}. Isso pode significar que essa combinação não tem significado clínico catalogado, ou que o rsid/genótipo está incorreto.`,
      });
    }

    const wikitext: string = primeiraPagina.revisions?.[0]?.["*"] ?? "";

    const resultado = {
      encontrado: true,
      rsid: rsid.toLowerCase(),
      genotipo,
      gene: extrairCampo(wikitext, "gene"),
      magnitude: extrairCampo(wikitext, "magnitude"),
      repute: extrairCampo(wikitext, "repute"),
      resumo: extrairCampo(wikitext, "summary"),
      fonte_url: `https://www.snpedia.com/index.php/${encodeURIComponent(titulo)}`,
    };

    // Se veio paciente, já guarda a consulta no histórico dele
    if (pacienteId) {
      await supabase.from("consultas_geneticas").insert({
        paciente_id: pacienteId,
        rsid: resultado.rsid,
        genotipo: resultado.genotipo,
        gene: resultado.gene,
        magnitude: resultado.magnitude ? parseFloat(resultado.magnitude) : null,
        repute: resultado.repute,
        resumo: resultado.resumo,
        fonte_url: resultado.fonte_url,
        consultado_por: user.id,
      });
    }

    return NextResponse.json(resultado);
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro de conexão com o SNPedia: " + erro.message }, { status: 500 });
  }
}
