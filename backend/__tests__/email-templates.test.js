const { entregaFotosEmail, escapeHtml } = require('../lib/email-templates');

const downloads = [
  { url: 'https://safe.test/download?token=a&x=1' },
  { url: 'https://safe.test/download?token=b' },
];

beforeEach(() => { process.env.PUBLIC_APP_URL = 'https://pascom-drive.test/'; });
afterEach(() => { delete process.env.PUBLIC_APP_URL; });

it('monta e-mail de entrega com pedido, saudacao e um botao por foto', () => {
  const email = entregaFotosEmail({ pedido: { id: 'PED_1', name: 'Maria Aparecida Souza' }, downloads });
  expect(email.subject).toBe('Suas fotos estão prontas — Paróquia São Rafael');
  expect(email.html).toContain('Olá, Maria!');
  expect(email.html).toContain('PED_1');
  expect(email.html).toContain('2 fotos');
  expect(email.html).toContain('Baixar foto 1');
  expect(email.html).toContain('Baixar foto 2');
  expect(email.html).toContain('href="https://safe.test/download?token=a&amp;x=1"');
  expect(email.html).toContain('https://pascom-drive.test/recuperar-pedido');
  expect(email.html).toContain('https://pascom-drive.test/assets/logo-white.png');
});

it('inclui versao em texto puro com todos os links', () => {
  const email = entregaFotosEmail({ pedido: { id: 'PED_1', name: 'Maria' }, downloads });
  expect(email.text).toContain('Pedido: PED_1');
  expect(email.text).toContain('Baixar foto 1: https://safe.test/download?token=a&x=1');
  expect(email.text).toContain('Baixar foto 2: https://safe.test/download?token=b');
  expect(email.text).not.toMatch(/<[a-z]/i);
});

it('usa singular e saudacao neutra quando ha uma foto e nenhum nome', () => {
  const email = entregaFotosEmail({ pedido: { id: 'PED_2' }, downloads: [downloads[1]] });
  expect(email.html).toContain('Olá! Recebemos');
  expect(email.html).toContain('Sua foto está pronta');
  expect(email.html).toContain('1 foto<');
  expect(email.html).not.toContain('Baixar foto 2');
});

it('escapa dados do comprador antes de inserir no HTML', () => {
  const email = entregaFotosEmail({ pedido: { id: 'PED_<b>', name: '<script>alert(1)</script>' }, downloads });
  expect(email.html).not.toContain('<script>');
  expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(email.html).toContain('PED_&lt;b&gt;');
  expect(escapeHtml(null)).toBe('');
});

describe('doacaoEmail', () => {
  const { doacaoEmail } = require('../lib/email-templates');
  const doacao = {
    id: 'DOA_1', name: 'Maria Aparecida', destinoLabel: 'Obras da Matriz', frequency: 'unica',
    amount: 100, fee: 4.56, total: 104.56, paidAt: '2026-10-08T18:00:00.000Z',
  };

  it('monta o comprovante com destino, valores e data', () => {
    const email = doacaoEmail({ doacao });
    expect(email.subject).toBe('Recebemos sua oferta — Paróquia São Rafael');
    expect(email.html).toContain('Maria, obrigado pela sua oferta.');
    expect(email.html).toContain('Obras da Matriz');
    expect(email.html).toContain('R$ 100,00');
    expect(email.html).toContain('R$ 4,56');
    expect(email.html).toContain('R$ 104,56');
    expect(email.html).toContain('8 de outubro de 2026');
    expect(email.html).toContain('cân. 1267 §3');
    expect(email.html).toContain('Açailândia · Ofertas');
    expect(email.html).not.toContain('compra de fotos');
    expect(email.text).toContain('Total: R$ 104,56');
  });

  it('omite a linha de taxa quando o doador nao cobriu e funciona sem nome', () => {
    const email = doacaoEmail({ doacao: { ...doacao, name: '', fee: 0, total: 100 } });
    expect(email.html).toContain('Obrigado pela sua oferta.');
    expect(email.html).not.toContain('Taxa do pagamento');
  });

  it('inclui o link de gerenciamento na doacao mensal', () => {
    const email = doacaoEmail({ doacao: { ...doacao, frequency: 'mensal' }, manageUrl: 'https://pascom-drive.test/doar/gerenciar?token=abc' });
    expect(email.subject).toBe('Recebemos sua oferta mensal — Paróquia São Rafael');
    expect(email.html).toContain('Gerenciar doação mensal');
    expect(email.html).toContain('href="https://pascom-drive.test/doar/gerenciar?token=abc"');
    expect(email.text).toContain('https://pascom-drive.test/doar/gerenciar?token=abc');
  });

  it('inclui o comprovante do Stripe quando o link existe', () => {
    const email = doacaoEmail({ doacao, receiptUrl: 'https://pay.stripe.com/receipts/abc' });
    expect(email.html).toContain('Ver comprovante do Stripe');
    expect(email.html).toContain('href="https://pay.stripe.com/receipts/abc"');
    expect(email.text).toContain('Comprovante do Stripe: https://pay.stripe.com/receipts/abc');
    expect(doacaoEmail({ doacao }).html).not.toContain('Ver comprovante do Stripe');
    expect(doacaoEmail({ doacao, receiptUrl: 'javascript:alert(1)' }).html).not.toContain('Ver comprovante do Stripe');
  });

  it('mantem o rodape de fotos no e-mail de entrega', () => {
    const { entregaFotosEmail: entrega } = require('../lib/email-templates');
    const html = entrega({ pedido: { id: 'PED_1' }, downloads: [{ url: 'https://safe.test/a' }] }).html;
    expect(html).toContain('compra de fotos');
    expect(html).toContain('Açailândia · Fotos');
  });
});
