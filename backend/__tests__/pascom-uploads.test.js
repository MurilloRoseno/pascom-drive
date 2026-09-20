jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, _res, next) => {
    req.auth = () => ({ userId: global.__clerkUserId || null });
    next();
  }),
  getAuth: jest.fn((req) => req.auth()),
  clerkClient: { users: { getUser: jest.fn() } },
}));

jest.mock('../lib/google-sheets.shared', () => ({
  rows: jest.fn(),
  yes: jest.requireActual('../lib/google-sheets.shared').yes,
}));

const crypto = require('crypto');
const request = require('supertest');
const { clerkClient } = require('@clerk/express');
const shared = require('../lib/google-sheets.shared');
const app = require('../server');

function row(data) {
  return { get: (key) => data[key], set: jest.fn(), save: jest.fn().mockResolvedValue() };
}

function appsScriptResponde(body) {
  global.fetch.mockResolvedValueOnce({ text: async () => JSON.stringify(body) });
}

function envelopeEnviado(index = 0) {
  return JSON.parse(global.fetch.mock.calls[index][1].body);
}

const evento = { categoria: 'casamento', data: '2026-05-20', titulo: 'Joao e Maria', totalArquivos: 2, bytesTotais: 2048 };
const uploadId = '1AbCdEfGhIjKlMnOp';

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  process.env.CLERK_SECRET_KEY = 'sk_test_123';
  process.env.UPLOAD_WEBAPP_URL = 'https://script.google.com/macros/s/abc/exec';
  process.env.APPS_SCRIPT_HMAC_SECRET = 'segredo-hmac';
  global.__clerkUserId = 'user_123';
  clerkClient.users.getUser.mockResolvedValue({
    fullName: 'Equipe',
    emailAddresses: [{ emailAddress: 'pascom@paroquia.test' }],
    phoneNumbers: [],
  });
  shared.rows.mockResolvedValue([row({ Identificador: 'pascom@paroquia.test', Tipo: 'email', Nome: 'Pascom', Role: 'admin', Ativo: 'SIM' })]);
});

afterEach(() => {
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.UPLOAD_WEBAPP_URL;
  delete process.env.APPS_SCRIPT_HMAC_SECRET;
});

it('exige login Pascom e membro ativo da EquipePascom', async () => {
  global.__clerkUserId = null;
  expect((await request(app).post('/api/pascom/uploads/eventos').send(evento)).status).toBe(401);
  global.__clerkUserId = 'user_123';
  shared.rows.mockResolvedValue([]);
  expect((await request(app).post('/api/pascom/uploads/eventos').send(evento)).status).toBe(403);
  expect(global.fetch).not.toHaveBeenCalled();
});

it('cria evento de envio assinando o envelope para o Apps Script', async () => {
  appsScriptResponde({ ok: true, data: { uploadId, nomePasta: 'casamento__2026-05-20__joao-e-maria' } });
  const response = await request(app).post('/api/pascom/uploads/eventos').send(evento);

  expect(response.status).toBe(201);
  expect(response.body.uploadId).toBe(uploadId);
  const envelope = envelopeEnviado();
  expect(envelope.acao).toBe('criarEvento');
  expect(JSON.parse(envelope.payload)).toEqual(expect.objectContaining({ ...evento, quem: 'pascom@paroquia.test' }));
  const esperado = crypto.createHmac('sha256', 'segredo-hmac')
    .update(`${envelope.timestamp}.criarEvento.${envelope.payload}`).digest('hex');
  expect(envelope.assinatura).toBe(esperado);
});

it('valida o formulario antes de chamar o Apps Script', async () => {
  const response = await request(app).post('/api/pascom/uploads/eventos').send({ ...evento, categoria: 'formatura' });
  expect(response.status).toBe(400);
  expect(response.body.error).toBe('Categoria invalida.');
  expect(global.fetch).not.toHaveBeenCalled();
});

it('abre sessoes com a origem do navegador e recusa HEIC ou lotes grandes', async () => {
  appsScriptResponde({ ok: true, data: { sessoes: [{ nome: 'a.jpg', sessionUrl: 'https://upload' }] } });
  const ok = await request(app)
    .post('/api/pascom/uploads/sessoes')
    .set('Origin', 'http://localhost:3000')
    .send({ uploadId, arquivos: [{ nome: 'a.jpg', mimeType: 'image/jpeg', tamanho: 100 }] });
  expect(ok.status).toBe(200);
  expect(JSON.parse(envelopeEnviado().payload).origem).toBe('http://localhost:3000');

  const heic = await request(app)
    .post('/api/pascom/uploads/sessoes')
    .send({ uploadId, arquivos: [{ nome: 'a.heic', mimeType: 'image/heic', tamanho: 100 }] });
  expect(heic.status).toBe(400);

  const lote = Array.from({ length: 21 }, (_, i) => ({ nome: `f${i}.jpg`, mimeType: 'image/jpeg', tamanho: 1 }));
  expect((await request(app).post('/api/pascom/uploads/sessoes').send({ uploadId, arquivos: lote })).status).toBe(400);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it('traduz erros de negocio do Apps Script em status HTTP com mensagem legivel', async () => {
  appsScriptResponde({ ok: false, codigo: 'envio_incompleto', error: 'Chegaram 1 de 2 fotos.' });
  const response = await request(app).post(`/api/pascom/uploads/eventos/${uploadId}/finalizar`).send({ esperados: 2 });
  expect(response.status).toBe(409);
  expect(response.body).toEqual({ error: 'Chegaram 1 de 2 fotos.', codigo: 'envio_incompleto' });

  appsScriptResponde({ ok: false, codigo: 'sem_espaco', error: 'Sem espaco.' });
  expect((await request(app).post('/api/pascom/uploads/eventos').send(evento)).status).toBe(507);
});

it('finaliza enviando capa escolhida e responde 503 quando nao configurado', async () => {
  appsScriptResponde({ ok: true, data: { nomePasta: 'casamento__2026-05-20__joao-e-maria', arquivos: 2 } });
  const response = await request(app)
    .post(`/api/pascom/uploads/eventos/${uploadId}/finalizar`)
    .send({ esperados: 2, capa: 'IMG_2.jpg' });
  expect(response.status).toBe(200);
  expect(JSON.parse(envelopeEnviado().payload)).toEqual(expect.objectContaining({ uploadId, capa: 'IMG_2.jpg', esperados: 2 }));

  delete process.env.UPLOAD_WEBAPP_URL;
  const semConfig = await request(app).post('/api/pascom/uploads/eventos').send(evento);
  expect(semConfig.status).toBe(503);
  expect(semConfig.body.codigo).toBe('nao_configurado');
});

it('recusa uploadId malformado na URL', async () => {
  const response = await request(app).post('/api/pascom/uploads/eventos/..%2F..%2Fx/finalizar').send({ esperados: 1 });
  expect(response.status).toBe(400);
  expect(global.fetch).not.toHaveBeenCalled();
});
