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

export default function PoliticaDePrivacidade() {
  return (
    <LayoutLegal titulo="Política de Privacidade" atualizadoEm="18 de setembro de 2026">
      <p style={estiloAviso}>
        <b>Nota de preenchimento:</b> os campos marcados como <b>[PREENCHER]</b> abaixo precisam ser completados com informações jurídicas
        reais da clínica (CNPJ, e-mail oficial de privacidade, e/ou nome do encarregado de dados) antes da publicação definitiva. Nenhum
        desses dados foi inventado.
      </p>

      <p>
        Esta Política de Privacidade descreve como a <b>Gran Fiori Wellness Clinic</b> ("Clínica", "nós") coleta, usa, armazena,
        compartilha e protege os dados pessoais tratados por meio do seu sistema de Prontuário Eletrônico ("Sistema"), em conformidade
        com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).
      </p>

      <h2 style={estiloH2}>1. Identificação do controlador</h2>
      <p>
        A Gran Fiori Wellness Clinic, com sede na Alameda Andrômeda, 885, Sala 1703, Torre Corporate, Alphaville, Barueri/SP, CEP
        06473-000, inscrita no CNPJ nº <b>[PREENCHER]</b>, é a controladora dos dados pessoais tratados por este Sistema, nos termos do
        art. 5º, VI, da LGPD.
      </p>

      <h2 style={estiloH2}>2. Dados pessoais coletados</h2>
      <p>Tratamos as seguintes categorias de dados pessoais de pacientes:</p>
      <ul>
        <li>Dados cadastrais: nome, CPF, data de nascimento, sexo, telefone, e-mail, endereço.</li>
        <li>
          <b>Dados pessoais sensíveis de saúde</b> (art. 5º, II, da LGPD), incluindo: histórico clínico, anamnese, diagnósticos, condutas,
          prescrições, resultados de exames laboratoriais, dados genéticos, avaliações físicas (composição corporal, condicionamento
          cardiorrespiratório), escalas de dor e desfecho, procedimentos realizados, e documentos médicos emitidos (receitas, relatórios,
          recibos).
        </li>
        <li>
          <b>Dados sincronizados de dispositivos vestíveis (wearables)</b>, quando o paciente autoriza a conexão: indicadores de sono,
          recuperação, frequência cardíaca, variabilidade da frequência cardíaca (HRV), saturação de oxigênio (SpO2) e nível de
          atividade, obtidos junto ao provedor do dispositivo (atualmente Oura Ring) mediante autorização própria do paciente diretamente
          na plataforma do fabricante.
        </li>
        <li>Dados de agendamento e histórico de atendimentos na Clínica.</li>
      </ul>

      <h2 style={estiloH2}>3. Finalidade do tratamento</h2>
      <p>Os dados pessoais são tratados exclusivamente para as seguintes finalidades:</p>
      <ul>
        <li>Prestação de cuidados de saúde, incluindo consultas, diagnóstico, tratamento e acompanhamento clínico do paciente;</li>
        <li>Elaboração e manutenção do prontuário eletrônico, conforme exigido pela regulamentação do Conselho Federal de Medicina;</li>
        <li>Emissão de documentos médicos (receitas, relatórios, recibos e guias de reembolso);</li>
        <li>Acompanhamento de indicadores de saúde e desempenho físico ao longo do tempo, incluindo dados de wearables, quando conectados;</li>
        <li>Comunicação com o paciente sobre agendamentos, follow-ups e orientações relacionadas ao tratamento;</li>
        <li>Cumprimento de obrigações legais e regulatórias aplicáveis a estabelecimentos de saúde.</li>
      </ul>

      <h2 style={estiloH2}>4. Base legal</h2>
      <p>
        O tratamento de dados sensíveis de saúde é realizado com base no art. 11, II, "f", da LGPD (tutela da saúde, em procedimento
        realizado por profissionais de saúde), e, quando aplicável, mediante <b>consentimento específico e destacado do titular</b> (art.
        11, I), especialmente no caso da conexão com dispositivos vestíveis, que é sempre uma ação voluntária e opcional do paciente.
      </p>

      <h2 style={estiloH2}>5. Consentimento e dados de wearables</h2>
      <p>
        A conexão de um dispositivo vestível (ex: Oura Ring) ao Sistema é <b>sempre iniciada e autorizada diretamente pelo paciente</b>,
        na própria plataforma do fabricante do dispositivo, que exibe ao paciente quais dados serão compartilhados antes da autorização.
        O Sistema não tem acesso ao dispositivo em si, apenas aos dados que o paciente autorizou compartilhar através da API oficial do
        fabricante. Essa autorização pode ser revogada a qualquer momento (veja a seção 9).
      </p>

      <h2 style={estiloH2}>6. Armazenamento e segurança</h2>
      <p>
        Os dados são armazenados em infraestrutura de banco de dados com controle de acesso por perfil de usuário (Row Level Security),
        de forma que apenas profissionais de saúde autorizados e administradores da Clínica podem acessar dados clínicos sensíveis.
        Credenciais de acesso a serviços externos (como tokens de conexão com wearables) são armazenadas de forma restrita, com acesso
        limitado à equipe autorizada. Toda comunicação entre o navegador do usuário e o Sistema é criptografada (HTTPS/TLS).
      </p>

      <h2 style={estiloH2}>7. Compartilhamento de dados</h2>
      <p>Os dados pessoais não são vendidos nem compartilhados para fins de marketing de terceiros. Podem ser compartilhados apenas:</p>
      <ul>
        <li>Com o próprio paciente, mediante solicitação;</li>
        <li>Com operadoras de plano de saúde, exclusivamente para fins de reembolso, quando solicitado pelo paciente;</li>
        <li>Com provedores de infraestrutura tecnológica que processam os dados em nome da Clínica (operadores de dados, nos termos da LGPD), sob obrigações contratuais de confidencialidade e segurança;</li>
        <li>Quando exigido por lei, ordem judicial ou requisição de autoridade competente.</li>
      </ul>

      <h2 style={estiloH2}>8. Prazo de retenção</h2>
      <p>
        O prontuário médico é mantido pelo prazo mínimo exigido pela regulamentação do Conselho Federal de Medicina (atualmente 20 anos
        a partir do último registro, podendo ser revisado conforme normas vigentes). Dados de conexão com wearables são mantidos
        enquanto a conexão estiver ativa e por um período posterior razoável para continuidade do acompanhamento clínico, podendo ser
        excluídos a pedido do paciente conforme a seção 10, ressalvada a obrigação legal de retenção do prontuário.
      </p>

      <h2 style={estiloH2}>9. Revogação da conexão com wearables</h2>
      <p>
        O paciente pode solicitar a qualquer momento a desconexão do seu dispositivo vestível junto à equipe da Clínica, que
        desativará a sincronização de novos dados imediatamente. Os dados já sincronizados permanecem no histórico clínico como parte
        do prontuário, salvo solicitação expressa de exclusão (seção 10). O paciente também pode revogar a autorização de acesso
        diretamente no aplicativo ou conta do fabricante do dispositivo (ex: Oura), o que interrompe o compartilhamento de novos dados
        independentemente de ação da Clínica.
      </p>

      <h2 style={estiloH2}>10. Direitos do titular e exclusão de dados</h2>
      <p>Nos termos do art. 18 da LGPD, o paciente tem direito a, mediante solicitação:</p>
      <ul>
        <li>Confirmar a existência de tratamento de seus dados;</li>
        <li>Acessar seus dados;</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>Solicitar a portabilidade de seus dados a outro prestador de serviço de saúde;</li>
        <li>Solicitar a exclusão de dados não sujeitos a obrigação legal de retenção (como dados de wearables desconectados);</li>
        <li>Revogar o consentimento dado para finalidades específicas, como a conexão de wearables;</li>
        <li>Solicitar informações sobre com quem seus dados foram compartilhados.</li>
      </ul>
      <p>
        Solicitações de exclusão do prontuário médico em si estão sujeitas às normas de retenção obrigatória do Conselho Federal de
        Medicina, que prevalecem sobre o pedido de exclusão enquanto vigentes.
      </p>

      <h2 style={estiloH2}>11. Canal de contato</h2>
      <p>
        Para exercer os direitos acima, tirar dúvidas sobre esta política ou reportar um incidente de segurança, entre em contato:
        <br />
        E-mail: <b>[PREENCHER — e-mail oficial de privacidade/contato da Clínica]</b>
        <br />
        Telefone: (11) 97472-2422
        <br />
        Encarregado de Dados (DPO): <b>[PREENCHER, se houver um designado]</b>
      </p>

      <h2 style={estiloH2}>12. Alterações desta política</h2>
      <p>
        Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças no Sistema ou na legislação aplicável. A
        data da última atualização é sempre indicada no topo desta página.
      </p>
    </LayoutLegal>
  );
}
