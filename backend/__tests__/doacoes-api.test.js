jest.mock('../lib/google-sheets', () => ({
  registrarDoacao: jest.fn().mockResolvedValue(undefined),
  buscarDoacaoById: jest.fn(),
}));
jest.mock('../lib/stripe', () => ({
  criarSessaoDoacao: jest.fn().mockResolvedValue({ id: 'cs_test_1', checkoutUrl: 'https://checkout.stripe.test/cs_test_1' }),
  buscarAssinatura: jest.fn(),
  cancelarAssinatura: jest.fn().mockResolvedValue({ id: 'sub_1', status: 'canceled' }),
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const handlers = require('../api/doacoes');
const sheets = require('../lib/google-sheets');
const stripe = require('../lib/stripe');
const { criarTokenAssinatura } = require('../lib/donations');

const app = express();
app.use(express.json());
app.get('/api/doacoes/config', handlers.config);
app.post('/api/doacoes/checkout', handlers.checkout);
app.get('/api/doacoes/status', handlers.status);
app.get('/api/doacoes/assinatura', handlers.assinatura);
app.post('/api/doacoes/assinatura/cancelar', handlers.cancelarAssinatura);
app.use(errorHandler);

const BODY = { amount: 50, destino: 'dizimo', frequency: 'unica', method: 'pix', coverFees: false };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DOWNLOAD_JWT_SECRET = 'segredo-de-teste';
});

describe('GET /api/doacoes/config', () => {
  it('devolve destinos e tarifas', async () => {
    const res = await request(app).get('/api/doacoes/config');
    expect(res.status).toBe(200);
    expect(res.body.destinos).toHaveLength(4);
    expect(res.body.tarifas.pix.percentage).toBe(1.19);
  });
});

describe('POST /api/doacoes/checkout', () => {
  it('cria sessao e registra a doacao pendente com o valor calculado no servidor', async () => {
    const res = await request(app).post('/api/doacoes/checkout').send({ ...BODY, total: 0.01, name: 'Maria', email: 'maria@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.doacaoId).toMatch(/^DOA_/);
    expect(res.body.checkoutUrl).toBe('https://checkout.stripe.test/cs_test_1');
    expect(res.body.resumo).toEqual({ amount: 50, fee: 0, total: 50, method: 'pix', coverFees: false });
    expect(stripe.criarSessaoDoacao).toHaveBeenCalledWith(expect.objectContaining({
      destino: { id: 'dizimo', label: 'Dízimo' }, frequency: 'unica', method: 'pix', email: 'maria@example.com',
    }));
    expect(sheets.registrarDoacao).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'cs_test_1', destino: 'dizimo', amount: 50, total: 50, name: 'Maria', email: 'maria@example.com',
    }));
  });

  it('aceita doacao sem nome e sem e-mail', async () => {
    const res = await request(app).post('/api/doacoes/checkout').send(BODY);
    expect(res.status).toBe(201);
    expect(sheets.registrarDoacao).toHaveBeenCalledWith(expect.objectContaining({ name: '', email: '' }));
  });

  it('inclui a taxa quando o doador decide cobrir', async () => {
    const res = await request(app).post('/api/doacoes/checkout').send({ ...BODY, method: 'credit_card', amount: 100, coverFees: true });
    expect(res.body.resumo.total).toBe(104.56);
  });

  it('exige cartao na doacao mensal', async () => {
    const res = await request(app).post('/api/doacoes/checkout').send({ ...BODY, frequency: 'mensal' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cartão/);
    expect(stripe.criarSessaoDoacao).not.toHaveBeenCalled();
  });

  it('recusa destino desconhecido, valor fora do limite e corpo invalido', async () => {
    expect((await request(app).post('/api/doacoes/checkout').send({ ...BODY, destino: 'missa' })).status).toBe(400);
    expect((await request(app).post('/api/doacoes/checkout').send({ ...BODY, amount: 1 })).status).toBe(400);
    expect((await request(app).post('/api/doacoes/checkout').send({ ...BODY, amount: '50' })).status).toBe(400);
    expect((await request(app).post('/api/doacoes/checkout').send({ ...BODY, email: 'nao-e-email' })).status).toBe(400);
    expect(sheets.registrarDoacao).not.toHaveBeenCalled();
  });
});

describe('GET /api/doacoes/status', () => {
  it('devolve o resumo sem dados pessoais', async () => {
    sheets.buscarDoacaoById.mockResolvedValue({
      id: 'DOA_aaaaaaaaaaaaaaaaaaaaaaaa', status: 'Confirmada', destino: 'obras', frequency: 'unica',
      amount: 50, fee: 0, total: 50, name: 'Maria', email: 'maria@example.com',
    });
    const res = await request(app).get('/api/doacoes/status?doacaoId=DOA_aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'DOA_aaaaaaaaaaaaaaaaaaaaaaaa', status: 'Confirmada', confirmed: true, destino: 'Obras da Matriz',
      frequency: 'unica', amount: 50, fee: 0, total: 50,
    });
  });

  it('valida o codigo e responde 404 quando nao existe', async () => {
    expect((await request(app).get('/api/doacoes/status?doacaoId=PED_1')).status).toBe(400);
    sheets.buscarDoacaoById.mockResolvedValue(null);
    expect((await request(app).get('/api/doacoes/status?doacaoId=DOA_aaaaaaaaaaaaaaaaaaaaaaaa')).status).toBe(404);
  });
});

describe('doacao mensal', () => {
  const assinatura = { id: 'sub_1', status: 'active', metadata: { destino: 'dizimo' }, total: 50, nextChargeAt: '2026-11-08T12:00:00.000Z' };

  it('mostra a assinatura para quem tem o link assinado', async () => {
    stripe.buscarAssinatura.mockResolvedValue(assinatura);
    const res = await request(app).get(`/api/doacoes/assinatura?token=${criarTokenAssinatura('sub_1')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'active', active: true, destino: 'Dízimo', total: 50, nextChargeAt: '2026-11-08T12:00:00.000Z' });
    expect(stripe.buscarAssinatura).toHaveBeenCalledWith('sub_1');
  });

  it('recusa link invalido sem consultar o Stripe', async () => {
    const res = await request(app).get('/api/doacoes/assinatura?token=token-invalido-qualquer-coisa');
    expect(res.status).toBe(401);
    expect(stripe.buscarAssinatura).not.toHaveBeenCalled();
  });

  it('cancela a assinatura ativa', async () => {
    stripe.buscarAssinatura.mockResolvedValue(assinatura);
    const res = await request(app).post('/api/doacoes/assinatura/cancelar').send({ token: criarTokenAssinatura('sub_1') });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'canceled', active: false });
    expect(stripe.cancelarAssinatura).toHaveBeenCalledWith('sub_1');
  });

  it('nao cancela de novo uma assinatura ja cancelada nem aceita link invalido', async () => {
    stripe.buscarAssinatura.mockResolvedValue({ ...assinatura, status: 'canceled' });
    await request(app).post('/api/doacoes/assinatura/cancelar').send({ token: criarTokenAssinatura('sub_1') });
    expect(stripe.cancelarAssinatura).not.toHaveBeenCalled();
    const res = await request(app).post('/api/doacoes/assinatura/cancelar').send({ token: 'token-invalido-qualquer-coisa' });
    expect(res.status).toBe(401);
  });
});
