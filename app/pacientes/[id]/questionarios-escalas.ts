// Conteúdo das escalas de desfecho — itens, opções e pontuação oficiais.
// Fique à vontade para revisar contra sua própria referência antes do primeiro uso clínico:
// escalas validadas exigem fidelidade exata ao enunciado e aos pesos de cada item.

export type Opcao = { label: string; valor: number };
export type Item = { id: string; texto: string; secao?: string; opcoes: Opcao[] };

export type Questionario = {
  itens: Item[];
  minimo: number;
  maximo: number;
  maiorEMelhor: boolean;
  calcular: (respostas: Record<string, number>) => number;
};

const somaDireta = (respostas: Record<string, number>) => Object.values(respostas).reduce((a, b) => a + b, 0);

export const QUESTIONARIOS: Record<string, Questionario> = {
  // ---------------------------------------------------------------
  EVA: {
    minimo: 0,
    maximo: 10,
    maiorEMelhor: false,
    calcular: (r) => r["dor"] ?? 0,
    itens: [
      {
        id: "dor",
        texto: "Qual a intensidade da sua dor agora?",
        opcoes: Array.from({ length: 11 }, (_, i) => ({ label: String(i), valor: i })),
      },
    ],
  },

  // ---------------------------------------------------------------
  Lysholm: {
    minimo: 0,
    maximo: 100,
    maiorEMelhor: true,
    calcular: somaDireta,
    itens: [
      {
        id: "coxeia",
        texto: "Coxeia (mancar)",
        opcoes: [
          { label: "Nenhuma", valor: 5 },
          { label: "Leve ou periódica", valor: 3 },
          { label: "Grave e constante", valor: 0 },
        ],
      },
      {
        id: "apoio",
        texto: "Uso de apoio",
        opcoes: [
          { label: "Nenhum", valor: 5 },
          { label: "Bengala ou muleta", valor: 2 },
          { label: "Impossível descarregar peso", valor: 0 },
        ],
      },
      {
        id: "bloqueio",
        texto: "Bloqueio (travamento do joelho)",
        opcoes: [
          { label: "Nenhuma sensação de travamento", valor: 15 },
          { label: "Sensação de travamento, mas sem bloqueio verdadeiro", valor: 10 },
          { label: "Bloqueio ocasional", valor: 6 },
          { label: "Bloqueio frequente", valor: 2 },
          { label: "Joelho travado no exame", valor: 0 },
        ],
      },
      {
        id: "instabilidade",
        texto: "Instabilidade (sensação de falseio)",
        opcoes: [
          { label: "Nunca cede", valor: 25 },
          { label: "Raramente, durante esportes ou esforços intensos", valor: 20 },
          { label: "Frequentemente durante esportes (ou incapaz de praticar)", valor: 15 },
          { label: "Ocasionalmente nas atividades diárias", valor: 10 },
          { label: "Frequentemente nas atividades diárias", valor: 5 },
          { label: "A cada passo", valor: 0 },
        ],
      },
      {
        id: "dor",
        texto: "Dor",
        opcoes: [
          { label: "Nenhuma", valor: 25 },
          { label: "Inconstante e leve durante esforço intenso", valor: 20 },
          { label: "Marcante durante esforço intenso", valor: 15 },
          { label: "Marcante ao caminhar mais de 2 km", valor: 10 },
          { label: "Marcante ao caminhar menos de 2 km", valor: 5 },
          { label: "Constante", valor: 0 },
        ],
      },
      {
        id: "inchaco",
        texto: "Inchaço",
        opcoes: [
          { label: "Nenhum", valor: 10 },
          { label: "Com esforços intensos", valor: 6 },
          { label: "Com esforços comuns", valor: 2 },
          { label: "Constante", valor: 0 },
        ],
      },
      {
        id: "escadas",
        texto: "Subir escadas",
        opcoes: [
          { label: "Sem problema", valor: 10 },
          { label: "Levemente prejudicado", valor: 6 },
          { label: "Um degrau de cada vez", valor: 2 },
          { label: "Impossível", valor: 0 },
        ],
      },
      {
        id: "agachar",
        texto: "Agachar",
        opcoes: [
          { label: "Sem problema", valor: 5 },
          { label: "Levemente prejudicado", valor: 4 },
          { label: "Não além de 90°", valor: 2 },
          { label: "Impossível", valor: 0 },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------
  WOMAC: {
    minimo: 0,
    maximo: 96,
    maiorEMelhor: false,
    calcular: somaDireta,
    itens: (() => {
      const escala = [
        { label: "Nenhuma", valor: 0 },
        { label: "Leve", valor: 1 },
        { label: "Moderada", valor: 2 },
        { label: "Intensa", valor: 3 },
        { label: "Muito intensa", valor: 4 },
      ];
      const dor = [
        "Ao caminhar em superfície plana",
        "Ao subir ou descer escadas",
        "À noite, na cama",
        "Sentado(a) ou deitado(a)",
        "Em pé",
      ];
      const rigidez = ["Rigidez matinal, ao acordar", "Rigidez que ocorre mais tarde no dia"];
      const funcao = [
        "Descer escadas",
        "Subir escadas",
        "Levantar-se estando sentado(a)",
        "Ficar em pé",
        "Curvar-se para o chão",
        "Andar em superfície plana",
        "Entrar ou sair do carro",
        "Fazer compras",
        "Calçar meias",
        "Levantar-se da cama",
        "Tirar as meias",
        "Deitar-se na cama",
        "Entrar ou sair do banho",
        "Sentar-se",
        "Sentar e levantar do vaso sanitário",
        "Tarefas domésticas pesadas",
        "Tarefas domésticas leves",
      ];
      return [
        ...dor.map((t, i) => ({ id: `dor_${i}`, texto: t, secao: "Dor", opcoes: escala })),
        ...rigidez.map((t, i) => ({ id: `rigidez_${i}`, texto: t, secao: "Rigidez", opcoes: escala })),
        ...funcao.map((t, i) => ({ id: `funcao_${i}`, texto: t, secao: "Função física", opcoes: escala })),
      ];
    })(),
  },

  // ---------------------------------------------------------------
  DASH: {
    minimo: 0,
    maximo: 100,
    maiorEMelhor: false,
    calcular: (r) => {
      const valores = Object.values(r);
      if (valores.length === 0) return 0;
      const media = valores.reduce((a, b) => a + b, 0) / valores.length;
      return Math.round(((media - 1) / 4) * 25 * 10) / 10;
    },
    itens: (() => {
      const dificuldade = [
        { label: "Sem dificuldade", valor: 1 },
        { label: "Dificuldade leve", valor: 2 },
        { label: "Dificuldade moderada", valor: 3 },
        { label: "Dificuldade grave", valor: 4 },
        { label: "Incapaz", valor: 5 },
      ];
      const atividades = [
        "Abrir um pote de vidro novo ou apertado",
        "Escrever",
        "Girar uma chave",
        "Preparar uma refeição",
        "Empurrar uma porta pesada para abri-la",
        "Colocar um objeto numa prateleira acima da cabeça",
        "Fazer tarefas domésticas pesadas (lavar paredes, chão)",
        "Cuidar do jardim ou quintal",
        "Arrumar a cama",
        "Carregar uma sacola de compras ou pasta",
        "Carregar um objeto pesado (mais de 5 kg)",
        "Trocar uma lâmpada no teto",
        "Lavar ou secar o cabelo",
        "Lavar as costas",
        "Vestir um suéter",
        "Usar uma faca para cortar alimentos",
        "Atividades recreativas de baixo impacto (cartas, tricô)",
        "Atividades recreativas com algum impacto no braço/ombro/mão (golfe, martelo, tênis)",
        "Atividades recreativas com movimento livre do braço (voleibol, frisbee)",
        "Deslocar-se de um lugar a outro",
        "Atividade sexual",
      ];
      const impacto = [
        "Nas últimas 2 semanas, a dor/o problema no braço, ombro ou mão interferiu nas atividades sociais normais com família, amigos, vizinhos ou grupos?",
        "Nas últimas 2 semanas, você foi limitado(a) no trabalho ou nas atividades diárias habituais por causa do problema no braço, ombro ou mão?",
      ];
      const gravidadeSintomas = [
        { texto: "Dor no braço, ombro ou mão", opcoes: [{ label: "Nenhuma", valor: 1 }, { label: "Leve", valor: 2 }, { label: "Moderada", valor: 3 }, { label: "Intensa", valor: 4 }, { label: "Extrema", valor: 5 }] },
        { texto: "Dor no braço, ombro ou mão ao realizar alguma atividade específica", opcoes: [{ label: "Nenhuma", valor: 1 }, { label: "Leve", valor: 2 }, { label: "Moderada", valor: 3 }, { label: "Intensa", valor: 4 }, { label: "Extrema", valor: 5 }] },
        { texto: "Formigamento (agulhadas) no braço, ombro ou mão", opcoes: [{ label: "Nenhum", valor: 1 }, { label: "Leve", valor: 2 }, { label: "Moderado", valor: 3 }, { label: "Intenso", valor: 4 }, { label: "Extremo", valor: 5 }] },
        { texto: "Fraqueza no braço, ombro ou mão", opcoes: [{ label: "Nenhuma", valor: 1 }, { label: "Leve", valor: 2 }, { label: "Moderada", valor: 3 }, { label: "Intensa", valor: 4 }, { label: "Extrema", valor: 5 }] },
        { texto: "Rigidez no braço, ombro ou mão", opcoes: [{ label: "Nenhuma", valor: 1 }, { label: "Leve", valor: 2 }, { label: "Moderada", valor: 3 }, { label: "Intensa", valor: 4 }, { label: "Extrema", valor: 5 }] },
      ];
      const sono = {
        texto: "Dificuldade para dormir por causa da dor no braço, ombro ou mão",
        opcoes: [{ label: "Nenhuma", valor: 1 }, { label: "Leve", valor: 2 }, { label: "Moderada", valor: 3 }, { label: "Intensa", valor: 4 }, { label: "Tão intensa que não consigo dormir", valor: 5 }],
      };
      const autoconfianca = {
        texto: "Sinto-me menos capaz, menos confiante ou menos útil por causa do meu problema no braço, ombro ou mão",
        opcoes: [{ label: "Discordo totalmente", valor: 1 }, { label: "Discordo", valor: 2 }, { label: "Não concordo nem discordo", valor: 3 }, { label: "Concordo", valor: 4 }, { label: "Concordo totalmente", valor: 5 }],
      };

      return [
        ...atividades.map((t, i) => ({ id: `at_${i}`, texto: t, secao: "Capacidade de realizar a atividade nas últimas 2 semanas", opcoes: dificuldade })),
        ...impacto.map((t, i) => ({ id: `imp_${i}`, texto: t, secao: "Impacto social e no trabalho", opcoes: dificuldade })),
        ...gravidadeSintomas.map((s, i) => ({ id: `sint_${i}`, texto: s.texto, secao: "Gravidade dos sintomas", opcoes: s.opcoes })),
        { id: "sono", texto: sono.texto, secao: "Gravidade dos sintomas", opcoes: sono.opcoes },
        { id: "autoconfianca", texto: autoconfianca.texto, secao: "Impacto psicológico", opcoes: autoconfianca.opcoes },
      ];
    })(),
  },

  // ---------------------------------------------------------------
  ODI: {
    minimo: 0,
    maximo: 100,
    maiorEMelhor: false,
    calcular: (r) => {
      const valores = Object.values(r);
      if (valores.length === 0) return 0;
      const soma = valores.reduce((a, b) => a + b, 0);
      return Math.round((soma / (valores.length * 5)) * 1000) / 10; // percentual
    },
    itens: [
      {
        id: "intensidade_dor",
        texto: "Intensidade da dor",
        opcoes: [
          { label: "Não tenho dor no momento", valor: 0 },
          { label: "A dor é muito leve no momento", valor: 1 },
          { label: "A dor é moderada no momento", valor: 2 },
          { label: "A dor é razoavelmente intensa no momento", valor: 3 },
          { label: "A dor é muito intensa no momento", valor: 4 },
          { label: "A dor é a pior imaginável no momento", valor: 5 },
        ],
      },
      {
        id: "cuidados_pessoais",
        texto: "Cuidados pessoais (lavar-se, vestir-se)",
        opcoes: [
          { label: "Consigo cuidar de mim normalmente, sem dor extra", valor: 0 },
          { label: "Consigo cuidar de mim normalmente, mas com dor extra", valor: 1 },
          { label: "É doloroso cuidar de mim, e sou lento(a) e cuidadoso(a)", valor: 2 },
          { label: "Preciso de alguma ajuda, mas viro-me com a maioria dos cuidados", valor: 3 },
          { label: "Preciso de ajuda todos os dias na maioria dos cuidados pessoais", valor: 4 },
          { label: "Não consigo me vestir, lavo-me com dificuldade e fico na cama", valor: 5 },
        ],
      },
      {
        id: "levantar_peso",
        texto: "Levantar peso",
        opcoes: [
          { label: "Consigo levantar objetos pesados sem dor extra", valor: 0 },
          { label: "Consigo, mas com dor extra", valor: 1 },
          { label: "A dor me impede de levantar objetos pesados do chão, mas consigo se estiverem bem posicionados (ex: numa mesa)", valor: 2 },
          { label: "A dor me impede de levantar objetos pesados, mas consigo pesos leves/moderados se bem posicionados", valor: 3 },
          { label: "Só consigo levantar objetos muito leves", valor: 4 },
          { label: "Não consigo levantar ou carregar nada", valor: 5 },
        ],
      },
      {
        id: "andar",
        texto: "Andar",
        opcoes: [
          { label: "A dor não me impede de andar qualquer distância", valor: 0 },
          { label: "A dor me impede de andar mais de 1600 m (1 milha)", valor: 1 },
          { label: "A dor me impede de andar mais de 800 m", valor: 2 },
          { label: "A dor me impede de andar mais de 400 m", valor: 3 },
          { label: "Só consigo andar usando bengala ou muletas", valor: 4 },
          { label: "Fico na cama a maior parte do tempo e preciso me arrastar ao banheiro", valor: 5 },
        ],
      },
      {
        id: "sentar",
        texto: "Sentar",
        opcoes: [
          { label: "Consigo sentar em qualquer cadeira pelo tempo que quiser", valor: 0 },
          { label: "Só consigo sentar na minha cadeira favorita pelo tempo que quiser", valor: 1 },
          { label: "A dor me impede de sentar por mais de 1 hora", valor: 2 },
          { label: "A dor me impede de sentar por mais de 30 minutos", valor: 3 },
          { label: "A dor me impede de sentar por mais de 10 minutos", valor: 4 },
          { label: "A dor me impede de sentar", valor: 5 },
        ],
      },
      {
        id: "ficar_em_pe",
        texto: "Ficar em pé",
        opcoes: [
          { label: "Consigo ficar em pé pelo tempo que quiser sem dor extra", valor: 0 },
          { label: "Consigo, mas com dor extra", valor: 1 },
          { label: "A dor me impede de ficar em pé por mais de 1 hora", valor: 2 },
          { label: "A dor me impede de ficar em pé por mais de 30 minutos", valor: 3 },
          { label: "A dor me impede de ficar em pé por mais de 10 minutos", valor: 4 },
          { label: "A dor me impede de ficar em pé", valor: 5 },
        ],
      },
      {
        id: "dormir",
        texto: "Dormir",
        opcoes: [
          { label: "O sono nunca é perturbado pela dor", valor: 0 },
          { label: "O sono é ocasionalmente perturbado pela dor", valor: 1 },
          { label: "Por causa da dor, durmo menos de 6 horas", valor: 2 },
          { label: "Por causa da dor, durmo menos de 4 horas", valor: 3 },
          { label: "Por causa da dor, durmo menos de 2 horas", valor: 4 },
          { label: "A dor me impede totalmente de dormir", valor: 5 },
        ],
      },
      {
        id: "vida_social",
        texto: "Vida social",
        opcoes: [
          { label: "Minha vida social é normal e não me causa dor extra", valor: 0 },
          { label: "Minha vida social é normal, mas aumenta o grau de dor", valor: 1 },
          { label: "A dor não tem efeito significativo na minha vida social, além de limitar atividades mais vigorosas (esportes, etc.)", valor: 2 },
          { label: "A dor restringiu minha vida social e não saio com tanta frequência", valor: 3 },
          { label: "A dor restringiu minha vida social ao lar", valor: 4 },
          { label: "Não tenho vida social por causa da dor", valor: 5 },
        ],
      },
      {
        id: "viajar",
        texto: "Viajar (deslocamentos)",
        opcoes: [
          { label: "Consigo viajar para qualquer lugar sem dor", valor: 0 },
          { label: "Consigo viajar para qualquer lugar, mas com dor extra", valor: 1 },
          { label: "A dor é forte, mas consigo viagens de mais de 2 horas", valor: 2 },
          { label: "A dor limita minhas viagens a menos de 1 hora", valor: 3 },
          { label: "A dor limita viagens curtas e necessárias de menos de 30 minutos", valor: 4 },
          { label: "A dor me impede de viajar, exceto para receber tratamento", valor: 5 },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------
  TSK: {
    minimo: 17,
    maximo: 68,
    maiorEMelhor: false,
    calcular: somaDireta,
    itens: (() => {
      const direta = [
        { label: "Discordo totalmente", valor: 1 },
        { label: "Discordo", valor: 2 },
        { label: "Concordo", valor: 3 },
        { label: "Concordo totalmente", valor: 4 },
      ];
      const invertida = [
        { label: "Discordo totalmente", valor: 4 },
        { label: "Discordo", valor: 3 },
        { label: "Concordo", valor: 2 },
        { label: "Concordo totalmente", valor: 1 },
      ];
      const frases = [
        { t: "Tenho medo de me machucar se fizer exercícios.", inv: false },
        { t: "Se eu tentasse superar isso, minha dor aumentaria.", inv: false },
        { t: "Meu corpo está me dizendo que algo está muito errado.", inv: false },
        { t: "Minha dor provavelmente seria aliviada se eu me exercitasse.", inv: true },
        { t: "As pessoas não estão levando minha condição médica a sério o suficiente.", inv: false },
        { t: "Meu acidente/lesão colocou meu corpo em risco pelo resto da minha vida.", inv: false },
        { t: "A dor sempre significa que eu machuquei meu corpo.", inv: false },
        { t: "Só porque algo agrava minha dor não significa que seja perigoso.", inv: true },
        { t: "Tenho medo de que eu possa me machucar acidentalmente.", inv: false },
        { t: "A forma mais segura de evitar que a dor piore é tomar cuidado para não fazer movimentos desnecessários.", inv: false },
        { t: "Eu não teria tanta dor se não houvesse algo potencialmente perigoso acontecendo no meu corpo.", inv: false },
        { t: "Embora minha condição seja dolorosa, eu estaria melhor se estivesse fisicamente ativo(a).", inv: true },
        { t: "A dor me avisa quando devo parar o exercício para não me machucar.", inv: false },
        { t: "Não é realmente seguro para uma pessoa na minha condição se exercitar.", inv: false },
        { t: "Não consigo fazer tudo o que as pessoas normais fazem porque é muito fácil eu me machucar.", inv: false },
        { t: "Mesmo que algo esteja causando muita dor, não acho que seja perigoso.", inv: true },
        { t: "Ninguém deveria ter que se exercitar quando está com dor.", inv: false },
      ];
      return frases.map((f, i) => ({ id: `t_${i}`, texto: f.t, opcoes: f.inv ? invertida : direta }));
    })(),
  },
};
