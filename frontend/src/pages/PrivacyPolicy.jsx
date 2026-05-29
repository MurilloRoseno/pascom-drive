/* eslint-disable react/prop-types */
import { Link } from 'react-router-dom';
import './privacy-policy.css';

const lastUpdate = '29 de maio de 2026';
const controllerName = 'Paróquia São Rafael';
const controllerAddress = 'Av. Contorno, Qd 59 Lt 09, Jardim de Alah, Açailândia - MA, CEP 65930-000';
const controllerEmail = 'paroquiasaorafael@hotmail.com';
const dpoEmail = 'paroquiasaorafael@hotmail.com';

const toc = [
  ['controlador', '1. Identificação do Controlador'],
  ['dados-coletados', '2. Dados Pessoais Coletados'],
  ['dados-sensiveis', '3. Dados Sensíveis e Imagens'],
  ['finalidades', '4. Finalidades do Tratamento'],
  ['bases-legais', '5. Bases Legais'],
  ['compartilhamento', '6. Compartilhamento'],
  ['retencao', '7. Retenção e Descarte'],
  ['seguranca', '8. Segurança da Informação'],
  ['direitos', '9. Direitos do Titular'],
  ['menores', '10. Crianças e Adolescentes'],
  ['cookies', '11. Cookies e Armazenamento Local'],
  ['ia', '12. IA, Perfilamento e Publicidade'],
  ['transferencia', '13. Transferência Internacional'],
  ['pastoral', '14. Compromisso Pastoral'],
  ['contato', '15. Contato'],
];

const legalBases = [
  ['Catálogo de eventos e galeria', 'Execução de serviço solicitado e legítimo interesse pastoral'],
  ['Compra e entrega de fotos', 'Execução de contrato, consentimento e cumprimento de obrigações legais'],
  ['Pagamentos via Mercado Pago', 'Execução de contrato e prevenção a fraude'],
  ['Galerias protegidas por código', 'Legítimo interesse, segurança e proteção de imagem'],
  ['Comunicação por e-mail/WhatsApp', 'Execução de serviço, consentimento e legítimo interesse'],
  ['Logs técnicos e segurança', 'Legítimo interesse e Marco Civil da Internet'],
  ['Fingerprint forense de downloads', 'Legítimo interesse, prevenção a fraude e proteção de direitos'],
];

const retention = [
  ['Pedidos e itens comprados', 'Pelo período necessário para entrega, suporte, auditoria e obrigações legais'],
  ['Links de download', 'Prazo técnico limitado, conforme configuração de segurança do backend'],
  ['Fingerprint forense', 'Enquanto necessário para auditoria antifraude, suporte e proteção de direitos'],
  ['Tokens/códigos de galeria', 'Enquanto necessários para acesso seguro à galeria'],
  ['Logs técnicos', 'Pelo tempo necessário para segurança, diagnóstico e obrigações legais'],
  ['Contatos por e-mail/WhatsApp', 'Enquanto houver necessidade de atendimento ou histórico pastoral legítimo'],
  ['Fotos e derivados no Drive', 'Conforme organização pastoral do evento e autorização de venda/publicação'],
];

function Icon({ name }) {
  const paths = {
    shield: 'M12 3 5 6v5c0 4.2 2.8 8 7 10 4.2-2 7-5.8 7-10V6l-7-3Z',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6V11Z',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
    mail: 'M4 4h16v16H4V4Zm0 4 8 6 8-6',
    file: 'M14 3H6v18h12V7l-4-4Zm0 0v4h4',
    check: 'm5 13 4 4L19 7',
    alert: 'M12 3 2 21h20L12 3Zm0 6v5m0 4h.01',
  };
  return (
    <svg className="privacy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function Section({ id, icon, title, children }) {
  return (
    <section id={id} className="privacy-section">
      <div className="privacy-section-heading">
        <span className="privacy-section-icon"><Icon name={icon} /></span>
        <h2>{title}</h2>
      </div>
      <div className="privacy-section-body">{children}</div>
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="privacy-subsection">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Li({ children }) {
  return <li><span aria-hidden="true" />{children}</li>;
}

function Table({ columns, rows }) {
  return (
    <div className="privacy-table-wrap">
      <table className="privacy-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.join('|')}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicy({ mobile = false }) {
  return (
    <div className={`privacy-page${mobile ? ' privacy-page--mobile scroll' : ''}`}>
      <header className="privacy-hero">
        <div className="privacy-hero-inner">
          <span className="privacy-hero-icon"><Icon name="shield" /></span>
          <p className="privacy-kicker">LGPD · Vida privada · Confidencialidade</p>
          <h1>Política de Privacidade</h1>
          <p>Última atualização: {lastUpdate}</p>
        </div>
      </header>

      <div className="privacy-badges">
        <span><Icon name="check" /> Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</span>
        <span><Icon name="check" /> Marco Civil da Internet (Lei nº 12.965/2014)</span>
        <span><Icon name="check" /> Tratamento proporcional e transparente</span>
      </div>

      <div className="privacy-shell">
        <aside className="privacy-toc" aria-label="Índice da política">
          <strong>Índice</strong>
          <nav>{toc.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
        </aside>

        <main className="privacy-content">
          <div className="privacy-intro">
            <p>
              A <strong>Paróquia São Rafael</strong>, em Açailândia/MA, apresenta esta Política de Privacidade para explicar, com transparência,
              como o Pascom Drive trata dados pessoais no fluxo de publicação, venda e entrega digital de fotos de eventos paroquiais.
            </p>
            <p>
              Esta política é informativa e não substitui orientação jurídica individual. Em caso de dúvida ou discordância, procure a secretaria paroquial antes de utilizar a galeria ou realizar compras.
            </p>
          </div>

          <Section id="controlador" icon="file" title="1. Identificação do Controlador">
            <p>O controlador dos dados pessoais, nos termos da LGPD, é:</p>
            <div className="privacy-card">
              <p><strong>Denominação:</strong> {controllerName}</p>
              <p><strong>Endereço:</strong> {controllerAddress}</p>
              <p><strong>E-mail:</strong> <a href={`mailto:${controllerEmail}`}>{controllerEmail}</a></p>
              <p><strong>Diocese:</strong> Diocese de Imperatriz - MA</p>
              <p><strong>Natureza:</strong> entidade religiosa sem fins lucrativos.</p>
            </div>
          </Section>

          <Section id="dados-coletados" icon="database" title="2. Dados Pessoais Coletados">
            <SubSection title="2.1 Dados fornecidos diretamente">
              <ul className="privacy-list">
                <Li><strong>Identificação e contato:</strong> nome, e-mail e WhatsApp informados no checkout ou no atendimento.</Li>
                <Li><strong>Pedido:</strong> fotos selecionadas, evento relacionado, meio de pagamento, status do pedido e histórico de entrega.</Li>
                <Li><strong>Recuperação de pedido:</strong> e-mail e código/pedido informados para localizar compras sem login.</Li>
                <Li><strong>Acesso à galeria:</strong> código de acesso quando a galeria for protegida e token temporário de sessão.</Li>
                <Li><strong>Comunicações:</strong> mensagens enviadas por e-mail, WhatsApp ou contato com a secretaria.</Li>
              </ul>
            </SubSection>
            <SubSection title="2.2 Dados coletados automaticamente">
              <ul className="privacy-list">
                <Li>Endereço IP, data/hora de acesso, navegador, tipo de dispositivo e registros técnicos de segurança.</Li>
                <Li>Páginas acessadas, eventos consultados e erros técnicos necessários para diagnóstico e proteção da plataforma.</Li>
                <Li>Dados mínimos em `sessionStorage` para manter tokens de galeria protegida durante a navegação.</Li>
                <Li>Dados locais em `localStorage` para favoritos antes da compra, contendo apenas IDs de evento/foto neste dispositivo.</Li>
                <Li>Identificador forense não sensível vinculado ao pedido/download, usado para rastrear vazamento de arquivo comprado sem embutir nome, e-mail ou WhatsApp na imagem.</Li>
              </ul>
            </SubSection>
          </Section>

          <Section id="dados-sensiveis" icon="eye" title="3. Dados Sensíveis e Imagens">
            <p>
              Fotos de celebrações religiosas podem revelar contexto de fé, participação comunitária e imagem de fiéis. Por isso, o Pascom Drive trata esse conteúdo com cuidado reforçado, acesso limitado e finalidade específica.
            </p>
            <ul className="privacy-list">
              <Li>Galerias podem ser públicas ou protegidas por código, conforme decisão pastoral/organizacional do evento.</Li>
              <Li>Pré-visualizações podem conter marca d’água e são exibidas apenas para escolha da foto.</Li>
              <Li>Fotos compradas são entregues por links seguros e não devem ser usadas fora das finalidades informadas.</Li>
              <Li>Eventos com crianças e adolescentes exigem atenção especial à autorização de imagem e ao princípio do melhor interesse do menor.</Li>
            </ul>
          </Section>

          <Section id="finalidades" icon="eye" title="4. Finalidades do Tratamento">
            <ul className="privacy-checks">
              <Li>Publicar catálogo de eventos paroquiais e permitir a busca por galerias.</Li>
              <Li>Controlar acesso a galerias protegidas e reduzir exposição indevida de imagens.</Li>
              <Li>Processar seleção de fotos, cotação, checkout e confirmação de pagamento.</Li>
              <Li>Enviar links de entrega por e-mail e apoiar atendimento por WhatsApp quando necessário.</Li>
              <Li>Permitir recuperação de pedido por e-mail e código, sem criar conta de usuário.</Li>
              <Li>Aplicar cupons pastorais e pacotes promocionais de forma auditável e proporcional.</Li>
              <Li>Prevenir fraudes, diagnosticar falhas, manter auditoria e proteger a integridade do sistema.</Li>
              <Li>Aplicar fingerprint forense proporcional em fotos entregues após pagamento para desestimular redistribuição indevida.</Li>
              <Li>Cumprir obrigações legais, contábeis, fiscais, pastorais e de segurança aplicáveis.</Li>
            </ul>
            <div className="privacy-warning">
              <Icon name="alert" />
              <p>O Pascom Drive não vende, aluga ou cede dados pessoais para publicidade comportamental ou exploração comercial de terceiros.</p>
            </div>
          </Section>

          <Section id="bases-legais" icon="shield" title="5. Bases Legais">
            <Table columns={['Atividade', 'Base legal predominante']} rows={legalBases} />
          </Section>

          <Section id="compartilhamento" icon="user" title="6. Compartilhamento de Dados">
            <p>O compartilhamento ocorre somente quando necessário e proporcional:</p>
            <ul className="privacy-list">
              <Li><strong>Mercado Pago:</strong> processamento do pagamento e retorno de status financeiro.</Li>
              <Li><strong>Google Sheets/Drive:</strong> organização operacional de eventos, fotos, pedidos e links de entrega.</Li>
              <Li><strong>Vercel:</strong> hospedagem da aplicação, APIs e registros técnicos de execução.</Li>
              <Li><strong>E-mail/SMTP e WhatsApp:</strong> entrega de links e atendimento ao comprador.</Li>
              <Li><strong>Autoridades públicas:</strong> quando houver obrigação legal, requisição válida ou ordem judicial.</Li>
            </ul>
            <p className="privacy-emphasis">Terceiros devem tratar dados apenas para as finalidades contratadas, com segurança e confidencialidade.</p>
          </Section>

          <Section id="retencao" icon="database" title="7. Retenção e Descarte">
            <Table columns={['Categoria', 'Critério de retenção']} rows={retention} />
            <p>Quando os dados deixarem de ser necessários, serão excluídos, anonimizados ou mantidos apenas quando houver obrigação legal, necessidade de auditoria ou interesse legítimo devidamente justificado.</p>
          </Section>

          <Section id="seguranca" icon="lock" title="8. Segurança da Informação">
            <ul className="privacy-list">
              <Li>Uso de HTTPS/TLS para tráfego público do site.</Li>
              <Li>Tokens de acesso para galerias protegidas e downloads.</Li>
              <Li>Segredos e credenciais mantidos em variáveis de ambiente, não no código público.</Li>
              <Li>Webhooks de pagamento com validação e registros de auditoria.</Li>
              <Li>Rate limiting em rotas sensíveis e cache controlado para catálogo e mídia.</Li>
              <Li>Downloads pagos podem receber fingerprint forense invisível, vinculado apenas ao pedido/download, para auditoria antifraude.</Li>
              <Li>Acesso operacional restrito a pessoas autorizadas pela paróquia.</Li>
            </ul>
          </Section>

          <Section id="direitos" icon="user" title="9. Direitos do Titular">
            <p>Você pode solicitar confirmação de tratamento, acesso, correção, informações sobre compartilhamento, revogação de consentimento, eliminação quando aplicável e revisão de eventual tratamento automatizado.</p>
            <div className="privacy-card">
              <p><strong>Como solicitar:</strong> envie e-mail para <a href={`mailto:${dpoEmail}`}>{dpoEmail}</a> com o assunto “LGPD - Solicitação de titular”.</p>
              <p>Para proteger sua privacidade, a paróquia poderá solicitar informações mínimas para confirmar sua identidade antes de atender ao pedido.</p>
            </div>
          </Section>

          <Section id="menores" icon="shield" title="10. Crianças e Adolescentes">
            <p>
              O site pode conter imagens de menores em celebrações e eventos paroquiais. A paróquia se compromete a tratar esses dados com dever reforçado de cuidado, respeito, decência e proteção contra exposição indevida.
            </p>
            <ul className="privacy-list">
              <Li>Publicação e venda de fotos devem observar autorizações pastorais e familiares aplicáveis.</Li>
              <Li>Responsáveis legais podem solicitar orientação, restrição ou remoção quando cabível.</Li>
              <Li>Galerias protegidas devem ter o código compartilhado apenas com pessoas legitimamente interessadas.</Li>
            </ul>
          </Section>

          <Section id="cookies" icon="eye" title="11. Cookies e Armazenamento Local">
            <p>O Pascom Drive usa armazenamento técnico mínimo para funcionamento da experiência:</p>
            <ul className="privacy-list">
              <Li><strong>Session storage:</strong> guarda temporariamente tokens de galerias protegidas no navegador.</Li>
              <Li><strong>Local storage:</strong> guarda favoritos locais por dispositivo antes da compra; esses favoritos não são enviados ao backend no MVP atual.</Li>
              <Li><strong>Cookies/headers técnicos:</strong> podem ser usados pela infraestrutura para segurança, cache e entrega do site.</Li>
              <Li><strong>Sem publicidade comportamental:</strong> não há cookies de anúncios ou rastreamento comercial de terceiros planejados no MVP atual.</Li>
              <Li><strong>Tokens de mídia:</strong> links de preview podem conter assinatura temporária para impedir coleta em massa e expiram automaticamente.</Li>
            </ul>
          </Section>

          <Section id="ia" icon="eye" title="12. IA, Perfilamento e Publicidade">
            <p>
              O Pascom Drive não realiza decisões automatizadas para negar acesso a serviços, avaliar pessoas, influenciar comportamento religioso ou criar perfis comerciais. Também não utiliza publicidade direcionada baseada em comportamento.
            </p>
            <p>O fingerprint forense de downloads não é usado para perfilamento, publicidade ou tomada de decisão automatizada; sua finalidade é exclusivamente antifraude e proteção de direitos sobre arquivos pagos.</p>
            <p>Se recursos de automação ou IA forem adicionados futuramente, esta política deverá ser atualizada com regras claras, limites proporcionais, transparência e possibilidade de contestação.</p>
          </Section>

          <Section id="transferencia" icon="database" title="13. Transferência Internacional">
            <p>
              Alguns provedores técnicos podem operar infraestrutura fora do Brasil. Nesses casos, a paróquia buscará utilizar serviços reconhecidos, medidas contratuais e controles técnicos compatíveis com a proteção exigida pela LGPD.
            </p>
          </Section>

          <Section id="pastoral" icon="shield" title="14. Compromisso Pastoral com a Vida Privada">
            <p>
              Inspirada pela dignidade da pessoa humana e pelo respeito à vida privada, a Paróquia São Rafael adota reserva, confidencialidade e proporcionalidade no uso de dados. A tecnologia deve servir à memória da comunidade e ao bem comum, não à vigilância, ao controle indevido ou à exposição desnecessária.
            </p>
          </Section>

          <Section id="contato" icon="mail" title="15. Contato e Encarregado">
            <div className="privacy-card">
              <p><strong>Encarregado:</strong> Secretaria da Paróquia São Rafael</p>
              <p><strong>E-mail:</strong> <a href={`mailto:${dpoEmail}`}>{dpoEmail}</a></p>
              <p><strong>Endereço:</strong> {controllerAddress}</p>
              <p><strong>Atendimento:</strong> terça a sexta, 8h30 às 11h.</p>
            </div>
          </Section>

          <footer className="privacy-footer">
            <span>© {new Date().getFullYear()} Paróquia São Rafael - Açailândia/MA.</span>
            <span><Link to="/">Página Inicial</Link> · <Link to="/buscar">Eventos</Link></span>
          </footer>
        </main>
      </div>
    </div>
  );
}
