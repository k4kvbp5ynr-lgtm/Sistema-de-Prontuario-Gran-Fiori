"use client";

import { useState } from "react";

type Item = { titulo: string; texto: React.ReactNode };
type Secao = { titulo: string; itens: Item[] };

const SECOES: Secao[] = [
  {
    titulo: "Pacientes",
    itens: [
      {
        titulo: "Lista de pacientes",
        texto: "Tela inicial. A busca é um dropdown: digite o nome e clique no resultado — a lista completa nunca fica exposta. Os cards do topo (Total de pacientes, Consultas este mês, Atendidos hoje) e a tabela \"Atendidos recentemente\" são só leitura, calculados a partir dos agendamentos e consultas já registrados.",
      },
      {
        titulo: "Cadastro de novo paciente",
        texto: "Nome é o único campo obrigatório. Peso e altura calculam o IMC automaticamente. A foto é opcional e pode ser adicionada depois, editando o cadastro dentro do prontuário do paciente.",
      },
    ],
  },
  {
    titulo: "Dentro do prontuário do paciente",
    itens: [
      {
        titulo: "Resumo (antes \"Dashboard\")",
        texto: "Primeiro ícone depois de \"Voltar\". Resumo visual do paciente — só mostra o que já tem dado preenchido em algum lugar (Avaliação física, exames, escalas), nunca aparece campo em branco. Cada indicador mostra o valor mais recente registrado daquele campo específico, mesmo que tenha vindo de avaliações diferentes. \"Ver gráficos de tendência\" mostra a evolução ao longo do tempo (inclusive das escalas de desfecho, de forma redundante com a tela própria delas). Tem botão de atualizar (↻) no canto — não precisa dar F5 na página depois de registrar algo novo.",
      },
      {
        titulo: "Avaliação física",
        texto: "Bioimpedância e ventilometria — ~30 campos (peso/IMC/TMB, gordura, massa magra/muscular, hidratação, ângulo de fase, VO2 máx, FC, pressão, condicionamento). Pode preencher manualmente ou usar \"Extrair de um PDF (IA)\" no topo do formulário, que lê o texto do laudo e pré-preenche — sempre revise antes de salvar. Funciona bem com laudos de ventilometria e com a versão \"Relatório\" (síntese em texto) de bioimpedância; a versão \"Bio\" (gráfica/gauges) só extrai poucos campos, porque a maioria dos valores é desenhada como gráfico, não como texto.",
      },
      {
        titulo: "Exportar PDF do prontuário",
        texto: "Botão \"Exportar PDF\" no cabeçalho da tela do paciente (visível pra todos os perfis). Gera um PDF único com dados cadastrais, alergias/medicações, histórico de consultas, exames laboratoriais, procedimentos, escalas de desfecho, avaliações físicas e lista de documentos emitidos — útil pra atender pedido de portabilidade de dados (LGPD) ou levar informação pra outro profissional.",
      },
      {
        titulo: "Linha do tempo (dentro de Histórico)",
        texto: "Fica no topo da aba Histórico, como uma faixa horizontal — consultas, exames, procedimentos, escalas, avaliações e documentos, em ordem cronológica da esquerda pra direita. Quando não cabe numa linha só, quebra pra linha de baixo automaticamente (não gera rolagem lateral). Filtros clicáveis por tipo. Cada item é clicável: exame/procedimento/escala/avaliação leva pra aba certa; receita/relatório/recibo abre num pop-up por cima da tela (sem trocar de página), com botão \"Fechar\" — assim você não perde o lugar onde estava.",
      },
      {
        titulo: "Faixa de segurança clínica (alergias e medicações)",
        texto: "Fica sempre visível no topo. Clique em \"Gerenciar\" para adicionar alergias e medicações em uso. Alergia grave e medicação anticoagulante aparecem em vermelho. Essas informações são lidas automaticamente pela IA de sugestão diagnóstica para checar interações — por isso vale a pena manter atualizado.",
      },
      {
        titulo: "Ditado por voz",
        texto: "Botão \"Ditar por voz\" acima dos campos de Anamnese e Conduta — usa o reconhecimento de fala nativo do navegador (Chrome/Edge), sem gravar nem guardar áudio no sistema. O navegador corta a sessão sozinho de tempos em tempos (comum acontecer a cada ~1 minuto) — o sistema detecta isso e reinicia automaticamente, então funciona contínuo por quanto tempo a consulta durar, sem perder trecho, desde que você não clique em parar. Ao lado, o botão \"Organizar com IA\" (só pra quem tem permissão de IA) pega o texto ditado — que costuma vir bagunçado, sem pontuação — e reescreve organizado e profissional, sem adicionar nem remover informação clínica, só limpando a forma. Importante: o áudio do ditado passa pelos servidores do Google durante o reconhecimento (não é 100% local) — não disponível no Safari/Firefox.",
      },
      {
        titulo: "Anamnese",
        texto: "Clique em \"Iniciar consulta\" antes de preencher — o sistema só deixa salvar com o cronômetro rodando (evita salvar a mesma consulta duas vezes por engano). Depois de salvar, o cronômetro volta sozinho para \"Iniciar consulta\", pronto para a próxima. O botão \"Gerar sugestão de IA\" usa o que está escrito na anamnese, mais o histórico do paciente, para sugerir hipóteses e conduta — a decisão final é sempre do profissional.",
      },
      {
        titulo: "Retificar uma consulta já salva (Histórico)",
        texto: "Nenhuma evolução é sobrescrita. Clicar em \"Retificar\" no Histórico exige escrever o motivo da alteração e guarda a versão anterior por completo, com data e quem alterou — \"Ver versões anteriores\" mostra esse histórico.",
      },
      {
        titulo: "Prescrição",
        texto: "Escolha o tipo (Simples / Controle especial / Antibiótico). \"Modelos salvos\" reaproveita prescrições que você já salvou antes. A assinatura eletrônica (selo \"assinatura A1\") usa o certificado cadastrado em Configurações → Assinaturas. Toda receita emitida entra automaticamente na lista de \"Exames avulsos\" do paciente, como um atalho pra reabrir depois — não duplica arquivo, é só um link pro documento já existente.",
      },
      {
        titulo: "Relatório médico",
        texto: "Documento de região única ou solicitação múltipla, com códigos TUSS e orçamento.",
      },
      {
        titulo: "Exames laboratoriais (dentro do menu \"Exames ▾\")",
        texto: "Suba o PDF do laudo e a IA extrai os resultados automaticamente, revisando contra a base de valores de referência antes de salvar. A tabela reúne exames de datas diferentes lado a lado, com cor por status (verde=normal, vermelho=acima, amarelo=abaixo).",
      },
      {
        titulo: "Genética",
        texto: "Busca por rsID + genótipo em bases públicas (MyVariant.info, MyGene.info, ClinVar, GWAS Catalog). Não usa IA — todo cálculo é determinístico. Os dados da variante ficam em cache: consultar o mesmo rsID para outro paciente não busca tudo de novo.",
      },
      {
        titulo: "Escalas (antes \"Escalas de desfecho\")",
        texto: "Clique na sigla da escala (EVA, WOMAC, Lysholm, DASH, ODI, TSK) para abrir o questionário clicável — a pontuação final é sempre calculada pelo sistema, nunca digitada. Precisa responder todos os itens pra liberar salvar. O gráfico de evolução aparece sozinho a partir da 2ª aplicação da mesma escala (e também aparece dentro do Dashboard).",
      },
      {
        titulo: "Procedimentos realizados",
        texto: "É o registro clínico do procedimento em si (protocolo, produto, lote, via, se foi guiado por USG) — diferente de \"Solicitação / reembolso\", que é sobre cobrança. Ambos ficam dentro do menu \"Procedimentos ▾\". Com o checkbox \"Criar follow-ups automáticos\" marcado, o sistema já agenda 3 tarefas de contato (D+7, D+30, D+90) que aparecem na tela inicial de Pacientes. Expandir um procedimento mostra o histórico desses follow-ups, incluindo a anotação de como foi o contato.",
      },
      {
        titulo: "Solicitação / reembolso (antes \"Procedimentos (reembolso)\", dentro do menu \"Procedimentos ▾\")",
        texto: "Aqui entra o valor cobrado e o código TUSS/CBHPM, usados para gerar o recibo/guia de reembolso que o paciente pede ao plano de saúde. É esse valor (\"valor cobrado\") que alimenta o Ticket médio em Indicadores.",
      },
      {
        titulo: "Exames avulsos",
        texto: "Para anexar qualquer documento sem passar pela extração automática por IA (ex: exames de imagem, laudos externos), ou pra ver as receitas emitidas (que entram aqui sozinhas).",
      },
      {
        titulo: "Chat flutuante",
        texto: "Bolinha no canto inferior direito, visível em qualquer aba da tela do paciente — abre o chat com a equipe sem precisar sair da consulta. Mostra contador de mensagens não lidas.",
      },
    ],
  },
  {
    titulo: "Agenda",
    itens: [
      {
        titulo: "Filtrar por profissional",
        texto: "Clique no nome do profissional na legenda para esconder/mostrar a agenda dele — pode selecionar vários ao mesmo tempo.",
      },
      {
        titulo: "Dia inteiro / eventos de vários dias",
        texto: "Marque \"Dia inteiro\" para compromissos sem horário fixo, ou preencha \"Data de fim\" diferente do início para algo que dura vários dias (ex: férias). Esses aparecem numa faixa própria acima da grade de horas, não dentro dela.",
      },
      {
        titulo: "Teleconsulta",
        texto: "Marque o checkbox \"Teleconsulta\" ao criar o agendamento — o sistema gera sozinho uma sala de vídeo (Jitsi Meet, sem precisar de conta) e guarda o link nesse agendamento específico. No detalhe do evento aparecem os botões \"Abrir sala\", \"Copiar link\" e \"Enviar por WhatsApp\" (usa o telefone cadastrado do paciente; se não tiver telefone, só fica a opção de copiar e enviar manualmente). Numa série recorrente, cada ocorrência tem sua própria sala.",
      },
      {
        titulo: "Repetição",
        texto: "Marque \"Repetir\", escolha os dias da semana (pode marcar mais de um) e até quando repetir. Ao cancelar ou excluir depois, o sistema pergunta se é só aquela ocorrência ou \"esta e as futuras\" da série — ocorrências passadas nunca são afetadas.",
      },
    ],
  },
  {
    titulo: "Configurações",
    itens: [
      { titulo: "Assinaturas", texto: "Cada usuário sobe sua própria assinatura (imagem) e certificado digital A1 aqui — a senha do certificado nunca é salva, só pedida na hora de assinar." },
      { titulo: "Procedimentos", texto: "Catálogo de procedimentos com código TUSS/CBHPM e valor de tabela — é o valor sugerido ao lançar um item em \"Solicitação / reembolso\" do paciente." },
      { titulo: "Tipos de evento", texto: "Define os tipos que aparecem ao criar um agendamento na Agenda (Consulta, Feriado, etc.) e se aquele tipo exige selecionar um paciente." },
      { titulo: "Equipe", texto: "Cadastro de usuários do sistema, perfil de acesso, permissão de uso de IA, e a cor que cada profissional usa na Agenda." },
      { titulo: "Rastreabilidade", texto: "Busca por número de lote — localiza todos os pacientes que receberam aquele lote, útil em caso de recall de produto (PRP, ácido hialurônico, toxina)." },
      { titulo: "Recall", texto: "Lista pacientes sem retorno há X meses, com botão de WhatsApp já com mensagem pronta. \"Última consulta\" considera três fontes: evolução clínica registrada, agendamento marcado como \"realizado\" na Agenda, e procedimento registrado — o que for mais recente." },
    ],
  },
  {
    titulo: "Indicadores — de onde vem cada número",
    itens: [
      {
        titulo: "Taxa de falta",
        texto: "Vem da Agenda: conta quantos agendamentos do mês estão marcados como \"Faltou\" (no detalhe do agendamento, ao clicar nele), dividido pelo total de agendamentos do mês que não foram cancelados. Se ninguém marcar \"Faltou\" quando o paciente não vem, esse número fica errado — é importante manter esse status atualizado na Agenda.",
      },
      {
        titulo: "Ticket médio",
        texto: "Vem do prontuário do paciente, menu \"Procedimentos ▾\" → \"Solicitação / reembolso\" — é a média do campo \"valor cobrado\" de todo item lançado ali no mês. Procedimentos sem valor preenchido não entram na conta. Não usa o \"Procedimentos realizados\" (esse não tem campo de valor, é só registro clínico).",
      },
      {
        titulo: "Procedimentos no mês",
        texto: "Vem da aba \"Procedimentos realizados\" do paciente — conta quantos foram registrados com data dentro do mês selecionado.",
      },
      {
        titulo: "Tempo médio de atendimento (TMA)",
        texto: "Vem do cronômetro da Anamnese: só existe tempo registrado se o profissional clicar em \"Iniciar consulta\" antes de preencher e salvar depois. Consultas em que ninguém usou o cronômetro não entram nessa média.",
      },
      {
        titulo: "Consultas registradas",
        texto: "Conta quantas evoluções (Anamneses salvas) existem com data dentro do mês selecionado — vem direto da aba Anamnese/Histórico de cada paciente.",
      },
    ],
  },
];

export default function ManualSistema() {
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem" }}>Manual do sistema</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--cor-texto-fraco)", marginBottom: 20 }}>
        Explicação rápida de cada função — clique num item para expandir. Toda tela do sistema tem um jeito de voltar (pelo menu lateral, pelas pílulas do paciente, ou pelo link "← Voltar" nas telas de documento). Dentro do paciente, as pílulas seguem a ordem do raciocínio clínico: Resumo → Anamnese → Avaliação física → Exames → Genética → Escalas → Procedimentos → Histórico. "Exames" e "Procedimentos" são menus (clique pra abrir as opções de dentro).
      </p>

      {SECOES.map((secao) => (
        <div key={secao.titulo} style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cor-marca-clara)", margin: "0 0 8px" }}>{secao.titulo}</p>
          {secao.itens.map((item) => {
            const chave = secao.titulo + item.titulo;
            const expandido = aberto === chave;
            return (
              <div key={chave} style={{ border: "1px solid var(--cor-borda)", borderRadius: 10, marginBottom: 6, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setAberto(expandido ? null : chave)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    color: "var(--cor-texto)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  {item.titulo}
                  <span style={{ color: "var(--cor-texto-fraco)" }}>{expandido ? "▾" : "▸"}</span>
                </button>
                {expandido && (
                  <div style={{ padding: "0 14px 12px", fontSize: 12.5, color: "var(--cor-texto-suave)", lineHeight: 1.6 }}>{item.texto}</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
