import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ND = "Não disponível nesta base.";
const CABECALHOS = { "User-Agent": "ProntuarioGranFiori/1.0 (uso clínico interno)" };

// =========================================================
// 1. MyVariant.info
// =========================================================
async function consultarMyVariant(rsid: string) {
  try {
    const url = `https://myvariant.info/v1/query?q=dbsnp.rsid:${encodeURIComponent(rsid)}&fields=all`;
    const resposta = await fetch(url, { headers: CABECALHOS });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const hit = dados?.hits?.[0];
    if (!hit) return null;

    const geneBruto = hit.dbnsfp?.genename ?? hit.cadd?.gene?.genename ?? hit.snpeff?.ann?.[0]?.gene_id ?? null;
    const geneLimpo = Array.isArray(geneBruto) ? geneBruto.find((g: any) => typeof g === "string" && g) ?? null : geneBruto;
    const siftBruto = hit.dbnsfp?.sift?.pred ?? null;
    const polyphenBruto = hit.dbnsfp?.polyphen2?.hdiv?.pred ?? null;

    return {
      rsid,
      chromosome: hit.chrom ?? null,
      position: hit.vcf?.position ?? hit.hg19?.start ?? null,
      ref: hit.vcf?.ref ?? null,
      alt: hit.vcf?.alt ?? null,
      gene: geneLimpo,
      consequencia_funcional: hit.snpeff?.ann?.[0]?.effect ?? hit.cadd?.consequence ?? null,
      clinvar_myvariant: hit.clinvar ?? null,
      cadd_score: hit.cadd?.phred ?? null,
      sift: Array.isArray(siftBruto) ? siftBruto[0] : siftBruto,
      polyphen: Array.isArray(polyphenBruto) ? polyphenBruto[0] : polyphenBruto,
      frequencias_populacionais: hit.gnomad_genome?.af ?? hit.dbnsfp?.gnomad?.af ?? null,
    };
  } catch {
    return null;
  }
}

function extrairGene(variant: any): string | null {
  return variant?.gene ?? null;
}

// =========================================================
// 2. MyGene.info
// =========================================================
async function consultarMyGene(geneSymbol: string) {
  try {
    const url = `https://mygene.info/v3/query?q=symbol:${encodeURIComponent(
      geneSymbol
    )}&species=human&fields=symbol,name,summary,entrezgene,ensembl,pathway,alias`;
    const resposta = await fetch(url, { headers: CABECALHOS });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const hit = dados?.hits?.[0];
    if (!hit) return null;

    const ensemblGeneId = Array.isArray(hit.ensembl) ? hit.ensembl[0]?.gene : hit.ensembl?.gene;

    // Achata pathways de kegg/reactome/wikipathways numa lista única e legível,
    // removendo duplicatas (a API às vezes repete o mesmo pathway).
    const pathwaysBrutos = [
      ...(hit.pathway?.kegg ?? []).map((p: any) => ({ nome: p.name, fonte: "KEGG" })),
      ...(hit.pathway?.reactome ?? []).map((p: any) => ({ nome: p.name, fonte: "Reactome" })),
      ...(hit.pathway?.wikipathways ?? []).map((p: any) => ({ nome: p.name, fonte: "WikiPathways" })),
    ];
    const pathwaysUnicos = Array.from(new Map(pathwaysBrutos.map((p) => [`${p.nome}|${p.fonte}`, p])).values());

    return {
      symbol: hit.symbol ?? null,
      name: hit.name ?? null,
      summary: hit.summary ?? null,
      entrez_id: hit.entrezgene ?? null,
      ensembl_gene_id: ensemblGeneId ?? null,
      pathways: pathwaysUnicos,
      aliases: hit.alias ?? null,
    };
  } catch {
    return null;
  }
}

// =========================================================
// 3. ClinVar — usa os dados que o MyVariant.info já traz vinculados corretamente
// =========================================================
function extrairClinVarDoMyVariant(variant: any) {
  const bruto = variant?.clinvar_myvariant;
  if (!bruto) return null;

  const itensBrutos = Array.isArray(bruto) ? bruto : [bruto];
  const todosRcv = itensBrutos.flatMap((item: any) => (Array.isArray(item?.rcv) ? item.rcv : item?.rcv ? [item.rcv] : []));
  if (todosRcv.length === 0) return null;

  return todosRcv.map((rcvItem: any) => {
    const nomeCondicao = rcvItem.conditions?.name ?? rcvItem.condition?.name ?? null;
    return {
      accession: rcvItem.accession ?? null,
      significancia_clinica: rcvItem.clinical_significance ?? null,
      review_status: rcvItem.review_status ?? null,
      condicoes: Array.isArray(nomeCondicao) ? nomeCondicao : nomeCondicao ? [nomeCondicao] : [],
      ultima_atualizacao: rcvItem.last_evaluated ?? null,
    };
  });
}

// =========================================================
// 4. GWAS Catalog (EMBL-EBI)
// =========================================================
async function consultarGWASCatalog(rsid: string) {
  try {
    const url = `https://www.ebi.ac.uk/gwas/rest/api/singleNucleotidePolymorphisms/${encodeURIComponent(
      rsid
    )}/associations?projection=associationBySnp`;
    const resposta = await fetch(url, { headers: CABECALHOS });

    if (!resposta.ok) {
      return { indisponivel: true, motivo: `GWAS Catalog respondeu status ${resposta.status}` };
    }

    const dados = await resposta.json();
    const lista = dados?._embedded?.associations ?? [];

    if (lista.length > 0) {
      console.log("[genetica] GWAS bruto (1º registro):", JSON.stringify(lista[0])?.slice(0, 1200));
    }

    const associacoes = lista.map((a: any) => {
      const loci = a.loci?.[0] ?? a.snps?.[0] ?? {};
      const efeitoBruto = a.strongestAllele ?? loci.strongestRiskAllele?.riskAlleleName ?? a.riskAllele ?? null;
      // formato comum é "rs123-A", extrai só o alelo depois do hífen
      const effectAllele = typeof efeitoBruto === "string" && efeitoBruto.includes("-") ? efeitoBruto.split("-").pop() : efeitoBruto;

      return {
        trait: a.efoTraits?.[0]?.trait ?? a.trait ?? null,
        efo_trait: a.efoTraits?.[0]?.shortForm ?? null,
        mapped_gene: a.mappedGenes?.[0]?.geneName ?? a.mappedGenes ?? null,
        effect_allele: effectAllele ?? null,
        or_value: a.orPerCopyNum ?? a.orValue ?? null,
        beta: a.betaNum ?? null,
        beta_unit: a.betaUnit ?? null,
        beta_direction: a.betaDirection ?? null,
        p_value: a.pvalue ?? null,
        intervalo_confianca: a.range ?? null,
        frequencia_alelo_efeito: a.riskFrequency ?? null,
        populacao: a.study?.initialSampleSize ?? null,
        titulo_estudo: a.study?.publicationInfo?.title ?? a.study?.study ?? null,
        pubmed_id: a.study?.publicationInfo?.pubmedId ?? a.study?.pubmedId ?? null,
        data_publicacao: a.study?.publicationInfo?.publicationDate ?? null,
        accession_estudo: a.study?.accessionId ?? null,
      };
    });

    return { indisponivel: false, associacoes };
  } catch (erro: any) {
    return { indisponivel: true, motivo: erro.message };
  }
}

// =========================================================
// 5. Normalização do genótipo (com checagem de fita/complemento)
// =========================================================
const MAPA_COMPLEMENTO: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };
function complemento(base: string): string {
  return MAPA_COMPLEMENTO[base.toUpperCase()] ?? base;
}

function normalizarGenotipo(genotype: string, variant: any) {
  const alelos = genotype
    .split(/[\/;]/)
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean);

  if (alelos.length !== 2) {
    return {
      valido: false,
      motivo: "Genótipo deve conter exatamente 2 alelos (ex: A/A, C/T).",
      alelos_informados: alelos,
    };
  }

  const homozigoto = alelos[0] === alelos[1];
  const ref: string | null = variant?.ref ?? null;
  const alt: string | null = variant?.alt ?? null;

  const base = {
    valido: true,
    alelos_informados: alelos,
    zigosidade: homozigoto ? ("homozigoto" as const) : ("heterozigoto" as const),
    ref,
    alt,
  };

  if (!ref || !alt) {
    return {
      ...base,
      alelos_reconhecidos_em_ref_alt: null,
      observacao: "Não foi possível confirmar REF/ALT (dado ausente na base consultada) — comparação não realizada.",
    };
  }

  const refAlt = [ref.toUpperCase(), alt.toUpperCase()];
  const ehPalindromico =
    (refAlt.includes("A") && refAlt.includes("T")) || (refAlt.includes("C") && refAlt.includes("G"));
  const bateDireto = alelos.every((a) => refAlt.includes(a));
  const bateComplementado = alelos.every((a) => refAlt.includes(complemento(a)));

  if (bateDireto) {
    return {
      ...base,
      alelos_reconhecidos_em_ref_alt: true,
      fita: "direta",
      observacao: ehPalindromico
        ? "Atenção: SNP palindrômico (A/T ou C/G). Mesmo os alelos batendo diretamente, a orientação de fita não pode ser confirmada com segurança sem informação extra do laboratório."
        : null,
    };
  }

  if (bateComplementado && !ehPalindromico) {
    return {
      ...base,
      alelos_reconhecidos_em_ref_alt: true,
      fita: "complementar",
      observacao:
        "Os alelos informados batem com o complemento de REF/ALT — provável diferença de orientação de fita entre o laboratório e a base consultada. Considere isso na interpretação.",
    };
  }

  return {
    ...base,
    alelos_reconhecidos_em_ref_alt: false,
    observacao: "Não foi possível determinar com segurança a correspondência entre o genótipo informado e o alelo de efeito.",
  };
}

// =========================================================
// 6/7/8/9/10. Regras determinísticas sobre as associações GWAS
// =========================================================
function contarCopias(alelosPaciente: string[], effectAllele: string | null): number | null {
  if (!effectAllele) return null;
  const efeito = effectAllele.toUpperCase();
  return alelosPaciente.filter((a) => a === efeito).length;
}

function interpretarOR(or: number | null): string | null {
  if (or === null || or === undefined || isNaN(or)) return null;
  if (or > 1) return "Associado a maior odds do fenótipo avaliado";
  if (or < 1) return "Associado a menor odds do fenótipo avaliado";
  return "Sem alteração da odds";
}

function interpretarBeta(beta: number | null): string | null {
  if (beta === null || beta === undefined || isNaN(beta)) return null;
  if (beta > 0) return "Efeito positivo sobre o trait conforme definido no estudo";
  if (beta < 0) return "Efeito negativo sobre o trait conforme definido no estudo";
  return null;
}

function classificarPValue(p: number | null): string | null {
  if (p === null || p === undefined || isNaN(p)) return null;
  return p < 5e-8 ? "Associação com significância genômica." : null;
}

function processarAssociacoesGWAS(gwas: any, alelosPaciente: string[]) {
  if (!gwas || gwas.indisponivel) {
    return { indisponivel: true, motivo: gwas?.motivo ?? null, grupos: [] };
  }

  const processadas = (gwas.associacoes ?? []).map((a: any) => {
    const copias = contarCopias(alelosPaciente, a.effect_allele);
    const orNum = a.or_value != null ? parseFloat(a.or_value) : null;
    const betaNum = a.beta != null ? parseFloat(a.beta) : null;
    const pNum = a.p_value != null ? parseFloat(a.p_value) : null;

    return {
      ...a,
      copias_alelo_efeito: copias,
      interpretacao_or: interpretarOR(orNum),
      interpretacao_beta: interpretarBeta(betaNum),
      significancia_genomica: classificarPValue(pNum),
    };
  });

  // Agrupa por trait
  const porTrait = new Map<string, any[]>();
  for (const a of processadas) {
    const chave = a.trait ?? "Trait não especificado";
    if (!porTrait.has(chave)) porTrait.set(chave, []);
    porTrait.get(chave)!.push(a);
  }

  const grupos = Array.from(porTrait.entries()).map(([trait, estudos]) => ({ trait, estudos, total: estudos.length }));

  return { indisponivel: false, grupos };
}

// =========================================================
// Cache por rsID (dados da variante são iguais pra qualquer paciente)
// =========================================================
async function buscarOuMontarCacheVariante(supabase: any, rsid: string) {
  const rsidNormalizado = rsid.toLowerCase();

  const { data: cache } = await supabase
    .from("variantes_geneticas_cache")
    .select("*")
    .eq("rsid", rsidNormalizado)
    .maybeSingle();

  // Reusa cache se tiver menos de 30 dias
  const cacheValido = cache && new Date().getTime() - new Date(cache.atualizado_em).getTime() < 30 * 24 * 60 * 60 * 1000;
  if (cacheValido) {
    return { variant: cache.dados_variant, gene: cache.dados_gene, clinvar: cache.dados_clinvar, gwas: cache.dados_gwas };
  }

  const variant = await consultarMyVariant(rsidNormalizado);
  const geneSymbol = extrairGene(variant);
  const [gene, gwas] = await Promise.all([
    geneSymbol ? consultarMyGene(geneSymbol) : Promise.resolve(null),
    consultarGWASCatalog(rsidNormalizado),
  ]);
  const clinvar = extrairClinVarDoMyVariant(variant);

  await supabase.from("variantes_geneticas_cache").upsert({
    rsid: rsidNormalizado,
    dados_variant: variant,
    dados_gene: gene,
    dados_clinvar: clinvar,
    dados_gwas: gwas,
    atualizado_em: new Date().toISOString(),
  });

  return { variant, gene, clinvar, gwas };
}

// =========================================================
// Função principal
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
    const { variant, gene, clinvar, gwas } = await buscarOuMontarCacheVariante(supabase, rsid);

    const genotypeNormalizado = normalizarGenotipo(genotype, variant);
    const alelosPaciente = genotypeNormalizado.alelos_informados ?? [];
    const gwasProcessado = processarAssociacoesGWAS(gwas, alelosPaciente);

    const resultado = {
      input: { rsid, genotype },
      genotype_normalized: genotypeNormalizado,
      variant: variant ?? { indisponivel: true },
      gene: gene ?? { indisponivel: true },
      clinical: clinvar ?? { indisponivel: true, mensagem: "Não disponível no ClinVar." },
      gwas: gwasProcessado,
      sources: {
        myvariant: `https://myvariant.info/v1/query?q=dbsnp.rsid:${encodeURIComponent(rsid)}`,
        mygene: gene?.symbol ? `https://mygene.info/v3/query?q=symbol:${encodeURIComponent(gene.symbol)}` : null,
        clinvar: `https://www.ncbi.nlm.nih.gov/clinvar/?term=${rsid}`,
        gwas: `https://www.ebi.ac.uk/gwas/search?query=${rsid}`,
      },
    };

    if (pacienteId) {
      const significanciaPrincipal = Array.isArray(clinvar) ? clinvar[0]?.significancia_clinica ?? null : null;
      await supabase.from("consultas_geneticas").insert({
        paciente_id: pacienteId,
        rsid: rsid.toLowerCase(),
        genotipo_informado: genotype,
        gene_symbol: gene?.symbol ?? null,
        significancia_clinica: significanciaPrincipal,
        resultado_completo: resultado,
        consultado_por: user.id,
      });
    }

    return NextResponse.json(resultado);
  } catch (erro: any) {
    return NextResponse.json({ erro: "Erro ao consultar as bases genéticas: " + erro.message }, { status: 500 });
  }
}
