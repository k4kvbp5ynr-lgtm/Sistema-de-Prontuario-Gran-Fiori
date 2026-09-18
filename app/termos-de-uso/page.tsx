import LayoutLegal from "../layout-legal";

const estiloH2: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: "#0b1214", margin: "28px 0 10px" };
const estiloAviso: React.CSSProperties = {
  background: "#fff6e5",
  border: "1px solid #e8c674",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  color: "#6b5010",
  margin: "6px 0 20px",
};

export default function TermosDeUso() {
  return (
    <LayoutLegal titulo="Termos de Uso" atualizadoEm="18 de setembro de 2026">
      <p style={estiloAviso}>
        <b>Nota de preenchimento:</b> os campos marcados como <b>[PREENCHER]</b> abaixo precisam ser completados com informações
        jurídicas reais da clínica (CNPJ, e-mail oficial de contato) antes da publicação definitiva. Nenhum desses dados foi inventado.
      </p>

      <p>
        Estes Termos de Uso regulam o acesso e a utilização do sistema de Prontuário Eletrônico da <b>Gran Fiori Wellness Clinic</b>{" "}
        ("Sistema"), disponibilizado exclusivamente para uso interno da clínica, seus profissionais de saúde e equipe autorizada. Ao
        acessar o Sistema, o usuário concorda integralmente com estes Termos.
      </p>

      <h2 style={estiloH2}>1. Finalidade do sistema</h2>
      <p>
        O Sistema é uma ferramenta de apoio ao registro, organização e acompanhamento de informações clínicas de pacientes da Gran
        Fiori Wellness Clinic, incluindo prontuário eletrônico, prescrições, exames, procedimentos, agenda e comunicação interna da
        equipe. O Sistema não substitui o julgamento clínico do profissional de saúde responsável, nem qualquer avaliação presencial
        necessária.
      </p>

      <h2 style={estiloH2}>2. Cadastro e acesso</h2>
      <p>
        O acesso ao Sistema é restrito a profissionais e colaboradores autorizados pela Clínica, mediante login individual. Cada
        usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as ações realizadas em sua conta.
        Suspeita de uso indevido ou acesso não autorizado deve ser reportada imediatamente à administração da Clínica.
      </p>

      <h2 style={estiloH2}>3. Responsabilidades do usuário</h2>
      <p>O usuário (profissional de saúde ou colaborador autorizado) compromete-se a:</p>
      <ul>
        <li>Utilizar o Sistema exclusivamente para as finalidades profissionais a que se destina;</li>
        <li>Inserir informações clínicas de forma precisa, completa e tempestiva, dentro de sua competência profissional;</li>
        <li>Não compartilhar suas credenciais de acesso com terceiros;</li>
        <li>Respeitar o sigilo profissional e a confidencialidade dos dados de pacientes a que tiver acesso, mesmo após o encerramento do vínculo com a Clínica;</li>
        <li>
          Utilizar recursos de inteligência artificial disponíveis no Sistema (sugestões diagnósticas, rascunhos, extrações
          automáticas) sempre como apoio, revisando criticamente qualquer resultado antes de utilizá-lo em decisão clínica ou documento
          oficial.
        </li>
      </ul>

      <h2 style={estiloH2}>4. Responsabilidades da Clínica</h2>
      <p>A Gran Fiori Wellness Clinic compromete-se a:</p>
      <ul>
        <li>Manter controles de acesso adequados, restringindo a visualização de dados clínicos sensíveis aos perfis profissionais pertinentes;</li>
        <li>Adotar medidas técnicas e organizacionais razoáveis de segurança da informação;</li>
        <li>Tratar os dados pessoais em conformidade com a legislação aplicável, conforme detalhado na Política de Privacidade;</li>
        <li>Comunicar aos usuários e, quando aplicável, aos titulares dos dados, eventuais incidentes de segurança relevantes.</li>
      </ul>

      <h2 style={estiloH2}>5. Limitações das informações fornecidas por wearables</h2>
      <p>
        O Sistema pode, mediante autorização do paciente, sincronizar dados de dispositivos vestíveis (wearables), como indicadores de
        sono, recuperação, frequência cardíaca e variabilidade cardíaca. Esses dados são fornecidos por sensores de consumo geral, não
        possuem certificação como dispositivo médico, e estão sujeitos a limitações de precisão inerentes à tecnologia utilizada pelo
        fabricante. Tais dados devem ser interpretados pelo profissional de saúde como <b>informação complementar de contexto</b>, nunca
        como medição clínica validada isoladamente.
      </p>

      <h2 style={estiloH2}>6. Ausência de garantia diagnóstica isolada</h2>
      <p>
        Nenhuma informação, sugestão, rascunho ou análise gerada pelo Sistema — incluindo recursos de inteligência artificial, dados de
        exames, escalas ou wearables — constitui, isoladamente, diagnóstico, prescrição ou conduta médica. Toda decisão clínica é de
        responsabilidade exclusiva do profissional de saúde habilitado que a formula, com base em sua avaliação profissional completa
        do paciente.
      </p>

      <h2 style={estiloH2}>7. Propriedade intelectual</h2>
      <p>
        O Sistema, seu código-fonte, design, marca e demais elementos são de propriedade da Gran Fiori Wellness Clinic ou de seus
        licenciantes, sendo vedada a reprodução, engenharia reversa, distribuição ou uso fora do escopo autorizado por estes Termos. Os
        dados inseridos por cada paciente ou profissional permanecem sob a titularidade e os direitos previstos na legislação de
        proteção de dados.
      </p>

      <h2 style={estiloH2}>8. Disponibilidade do serviço</h2>
      <p>
        A Clínica envida esforços razoáveis para manter o Sistema disponível de forma contínua, mas não garante disponibilidade
        ininterrupta, podendo ocorrer interrupções para manutenção, atualização ou por motivos fora de seu controle (ex: indisponibilidade
        de provedores de infraestrutura ou serviços de terceiros integrados). Recomenda-se manter registros alternativos essenciais em
        caso de indisponibilidade prolongada.
      </p>

      <h2 style={estiloH2}>9. Encerramento de conta</h2>
      <p>
        O acesso de um usuário ao Sistema pode ser suspenso ou encerrado pela Clínica a qualquer momento, em especial no desligamento
        do colaborador ou em caso de uso indevido, sem prejuízo dos registros já efetuados no prontuário, que permanecem preservados
        conforme a legislação aplicável. O usuário pode solicitar o encerramento de seu próprio acesso a qualquer momento à
        administração da Clínica.
      </p>

      <h2 style={estiloH2}>10. Legislação aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial a Lei Geral de Proteção de Dados Pessoais
        (Lei nº 13.709/2018) e as normas do Conselho Federal de Medicina aplicáveis ao prontuário eletrônico. Fica eleito o foro da
        comarca de Barueri/SP para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.
      </p>

      <h2 style={estiloH2}>11. Contato</h2>
      <p>
        Dúvidas sobre estes Termos de Uso podem ser encaminhadas para:
        <br />
        E-mail: <b>[PREENCHER — e-mail oficial de contato da Clínica]</b>
        <br />
        Telefone: (11) 97472-2422
      </p>
    </LayoutLegal>
  );
}
