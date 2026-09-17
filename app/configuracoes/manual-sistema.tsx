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
        titulo: "Faixa de segurança clínica (alergias e medicações)",
        texto: "Fica sempre visível no topo. Clique em \"Gerenciar\" para adicionar alergias e medicações em uso. Alergia grave e medicação anticoagulante aparecem em vermelho. Essas informações são lidas automaticamente pela IA de sugestão diagnóstica para checar interações — por isso vale a pena manter atualizado.",
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
        texto: "Escolha o tipo (Simples / Controle especial / Antibiótico). \"Modelos salvos\" reaproveita prescrições que você já salvou antes. A assinatura eletrônica (selo \"assinatura A1\") usa o certificado cadastrado em Configurações → Assinaturas.",
      },
      {
        titulo: "Exames de análises clínicas",
        texto: "Suba o PDF do laudo e a IA extrai os resultados automaticamente, revisando contra a base de valores de referência antes de salvar. A tabela reúne exames de datas diferentes lado a lado, com cor por status (verde=normal, vermelho=acima, amarelo=abaixo).",
      },
      {
        titulo: "Genética",
        texto: "Busca por rsID + genótipo em bases públicas (MyVariant.info, MyGene.info, ClinVar, GWAS Catalog). Não usa IA — todo cálculo é determinístico. Os dados da variante ficam em cache: consultar o mesmo rsID para outro paciente não busca tudo de novo.",
      },
      {
        titulo: "Escalas de desfecho",
        texto: "Clique na sigla da escala (EVA, WOMAC, Lysholm, DASH, ODI, TSK) para abrir o questionário clicável — a pontuação final é sempre calculada pelo sistema, nunca digitada. Precisa responder todos os itens pra liberar salvar. O gráfico de evolução aparece sozinho a partir da 2ª aplicação da mesma escala.",
      },
      {
        titulo: "Procedimentos realizados",
        texto: "É o registro clínico do procedimento em si (protocolo, produto, lote, via, se foi guiado por USG) — diferente de \"Procedimentos (reembolso)\", que é sobre cobrança. Com o checkbox \"Criar follow-ups automáticos\" marcado, o sistema já agenda 3 tarefas de contato (D+7, D+30, D+90) que aparecem na tela inicial de Pacientes. Expandir um procedimento mostra o histórico desses follow-ups, incluindo a anotação de como foi o contato.",
      },
      {
        titulo: "Procedimentos (reembolso)",
        texto: "Aqui entra o valor cobrado e o código TUSS/CBHPM, usados para gerar o recibo/guia de reembolso que o paciente pede ao plano de saúde. É esse valor (\"valor cobrado\") que alimenta o Ticket médio em Indicadores.",
      },
      {
        titulo: "Exames avulsos",
        texto: "Para anexar qualquer documento de exame sem passar pela extração automática por IA (ex: exames de imagem, laudos externos).",
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
        titulo: "Repetição",
        texto: "Marque \"Repetir\", escolha os dias da semana (pode marcar mais de um) e até quando repetir. Ao cancelar ou excluir depois, o sistema pergunta se é só aquela ocorrência ou \"esta e as futuras\" da série — ocorrências passadas nunca são afetadas.",
      },
    ],
  },
  {
    titulo: "Configurações",
    itens: [
      { titulo: "Assinaturas", texto: "Cada usuário sobe sua própria assinatura (imagem) e certificado digital A1 aqui — a senha do certificado nunca é salva, só pedida na hora de assinar." },
      { titulo: "Procedimentos", texto: "Catálogo de procedimentos com código TUSS/CBHPM e valor de tabela — é o valor sugerido ao lançar um item em \"Procedimentos (reembolso)\" do paciente." },
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
        texto: "Vem do prontuário do paciente, aba \"Procedimentos (reembolso)\" — é a média do campo \"valor cobrado\" de todo item lançado ali no mês. Procedimentos sem valor preenchido não entram na conta. Não usa o \"Procedimentos realizados\" (esse não tem campo de valor, é só registro clínico).",
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
        Explicação rápida de cada função — clique num item para expandir.
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
