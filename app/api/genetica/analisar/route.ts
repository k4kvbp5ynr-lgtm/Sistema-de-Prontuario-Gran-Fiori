import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NAO_DISPONIVEL = "Não disponível nas bases consultadas.";

// =========================================================
// 1. MyVariant.info
// =========================================================
async function consultarMyVariant(rsid: string) {
  const url = `https://myvariant.info/v1/query?q=dbsnp.rsid:${encodeURIComponent(rsid)}&fields=all`;
  const resposta = await fetch(url, { headers: { "User-Agent": "ProntuarioGranFiori/1.0" } });
  if (!resposta.ok) return null;
  const dados = await resposta.json();
  const hit = dados?.hits?.[0];
  if (!hit) return null;

  const geneBruto = hit.dbnsfp?.genename ?? hit.cadd?.gene?.genename ?? hit.snpeff?.ann?.[0]?.gene_id ?? null;
  const geneLimpo = Array.isArray(geneBruto)
    ? geneBruto.find((g: any) => typeof g === "string" && g) ?? null
    : geneBruto;

  return {
    rsid,
    chromosome: hit.chrom ?? null,
    position: hit.vcf?.position ?? hit.hg19?.start ?? null,
    ref: hit.vcf?.ref ?? null,
    alt: hit.vcf?.alt ?? null,
    gene: geneLimpo,
    consequencia_funcional: hit.snpeff?.ann?.[0]?.effect ?? hit.cadd?.consequence ?? null,
    dbsnp: hit.dbsnp ?? null,
    clinvar_myvariant: hit.clinvar ?? null,
    cadd_score: hit.cadd?.phred ?? null,
    sift: hit.dbnsfp?.sift?.pred ?? null,
    polyphen: hit.dbnsfp?.polyphen2?.hdiv?.pred ?? null,
    frequencias_populacionais: hit.gnomad_genome?.af ?? hit.dbnsfp?.gnomad?.af ?? null,
    bruto: hit, // guarda a resposta inteira, sem cortar nada, pra não perder dado disponível
  };
}

function extrairGene(variant: any): string | null {
  return variant?.gene ?? null;
}

// =========================================================
// 2. MyGene.info
// =========================================================
async function consultarMyGene(geneSymbol: string) {
  const url = `https://mygene.info/v3/query?q=symbol:${encodeURIComponent(
    geneSymbol
  )}&species=human&fields=symbol,name,summary,entrezgene,ensembl,refseq,go,pathway,alias`;
  const resposta = await fetch(url, { headers: { "User-Agent": "ProntuarioGranFiori/1.0" } });
  if (!resposta.ok) return null;
  const dados = await resposta.json();
  const hit = dados?.hits?.[0];
  if (!hit) return null;

  return {
    symbol: hit.symbol ?? null,
    name: hit.name ?? null,
    summary: hit.summary ?? null,
    entrez_id: hit.entrezgene ?? null,
    ensembl: hit.ensembl ?? null,
    refseq: hit.refseq ?? null,
    gene_ontology: hit.go ?? null,
    pathways: hit.pathway ?? null,
    aliases: hit.alias ?? null,
    bruto: hit,
  };
}

// =========================================================
// 3. ClinVar / NCBI (E-utilities)
// =========================================================
async function consultarClinVar(rsid: string) {
  const rsidNumero = rsid.replace(/^rs/i, "");
  const buscaUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${rsidNumero}%5BRS%5D&retmode=json`;
  const buscaResposta = await fetch(buscaUrl, { headers: { "User-Agent": "ProntuarioGranFiori/1.0" } });
  if (!buscaResposta.ok) return null;
  const buscaDados = await buscaResposta.json();
  const ids: string[] = buscaDados?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return null;

  const resumoUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${ids.join(
    ","
  )}&retmode=json`;
  const resumoResposta = await fetch(resumoUrl, { headers: { "User-Agent": "ProntuarioGranFiori/1.0" } });
  if (!resumoResposta.ok) return null;
  const resumoDados = await resumoResposta.json();
  console.log("[genetica] ClinVar bruto (1º registro):", JSON.stringify(resumoDados?.result?.[ids[0]])?.slice(0, 800));

  const registros = ids
    .map((id) => resumoDados?.result?.[id])
    .filter(Boolean)
    .map((r: any) => {
      // ClinVar mudou o esquema: campos de classificação agora ficam dentro de
      // "germline_classification" em vez de "clinical_significance" direto.
      const classificacao = r.germline_classification ?? r.clinical_significance ?? {};
      const traits = classificacao.trait_set ?? r.trait_set ?? [];
      return {
        accession: r.accession ?? null,
        significancia_clinica: classificacao.description ?? null,
        review_status: classificacao.review_status ?? null,
        condicoes: traits.map((t: any) => t.trait_name).filter(Boolean),
        ultima_atualizacao: classificacao.last_evaluated ?? null,
      };
    });

  return registros;
}

// =========================================================
// 4. Normalização do genótipo
// =========================================================
function normalizarGenotipo(rsid: string, genotype: string, variant: any) {
  const alelos = genotype
    .split(/[\/;]/)
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean);

  if (alelos.length !== 2) {
    return {
      valido: false,
      motivo: "Genótipo deve conter exatamente 2 alelos (ex: C/T).",
      alelos_informados: alelos,
    };
  }

  const ref = variant?.ref ?? null;
  const alt = variant?.alt ?? null;
  const alelosConhecidos = [ref, alt].filter(Boolean).map((a: string) => a.toUpperCase());

  const homozigoto = alelos[0] === alelos[1];
  const alelosReconhecidos = alelosConhecidos.length > 0 ? alelos.every((a) => alelosConhecidos.includes(a)) : null;

  return {
    valido: true,
    alelos_informados: alelos,
    zigosidade: homozigoto ? "homozigoto" : "heterozigoto",
    ref,
    alt,
    alelos_reconhecidos_em_ref_alt: alelosReconhecidos,
    observacao:
      alelosReconhecidos === false
        ? "Atenção: os alelos informados não batem com REF/ALT retornados pela base. Pode ser diferença de orientação de fita (strand) ou erro de digitação — confira manualmente."
        : alelosReconhecidos === null
        ? "Não foi possível confirmar REF/ALT (dado ausente na base consultada) — comparação não realizada."
        : null,
  };
}

// =========================================================
// 5. Função principal
// =========================================================
export async function POST(request: NextRequest) {
  const { pacienteId, rsid, genotype } = await request.json();

  if (!rsid || !genotype) {
    return NextResponse.json({ erro: "Informe o rsID e o genótipo." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  try {
    const variant = await consultarMyVariant(rsid);
    const genotypeNormalizado = normalizarGenotipo(rsid, genotype, variant);
    const geneSymbol = extrairGene(variant);

    const [gene, clinvar] = await Promise.all([
      geneSymbol ? consultarMyGene(geneSymbol) : Promise.resolve(null),
      consultarClinVar(rsid),
    ]);

    const resultado = {
      input: { rsid, genotype },
      genotype_normalized: genotypeNormalizado,
      variant: variant ?? { mensagem: NAO_DISPONIVEL },
      gene: gene ?? { mensagem: NAO_DISPONIVEL },
      clinical: clinvar ?? { mensagem: NAO_DISPONIVEL },
      sources: {
        myvariant: `https://myvariant.info/v1/query?q=dbsnp.rsid:${encodeURIComponent(rsid)}`,
        mygene: geneSymbol ? `https://mygene.info/v3/query?q=symbol:${encodeURIComponent(geneSymbol)}` : null,
        clinvar: `https://www.ncbi.nlm.nih.gov/clinvar/?term=${rsid}`,
      },
    };

    if (pacienteId) {
      await supabase.from("consultas_geneticas").insert({
        paciente_id: pacienteId,
        rsid,
        genotipo_informado: genotype,
        gene_symbol: geneSymbol,
        significancia_clinica: Array.isArray(clinvar) ? clinvar[0]?.significancia_clinica ?? null : null,
        resultado_completo: resultado,
        consultado_por: user.id,
      });
    }

    return NextResponse.json(resultado);
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro ao consultar as bases genéticas: " + erro.message }, { status: 500 });
  }
}
