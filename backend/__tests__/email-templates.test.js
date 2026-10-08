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
