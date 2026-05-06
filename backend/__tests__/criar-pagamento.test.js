jest.mock('../lib/google-sheets', () => ({
  registrarPedido: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/mercado-pago', () => ({
  criarPagamentoPix: jest.fn().mockResolvedValue({
    id: 'MP_123',
    qrCode: 'QR_STRING',
    qrCodeBase64: 'BASE64',
  }),
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const criarPagamentoHandler = require('../api/criar-pagamento');

const app = express();
app.use(express.json());
app.all('/api/criar-pagamento', criarPagamentoHandler);
app.use(errorHandler);

const VALID_BODY = { whatsapp: '11999999999', fotoIds: ['FOTO_001'], total: 25.75 };

describe('POST /api/criar-pagamento', () => {
  it('retorna 201 com id, qrCode, qrCodeBase64', async () => {
    const res = await request(app).post('/api/criar-pagamento').send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('qrCode');
    expect(res.body).toHaveProperty('qrCodeBase64');
  });

  it('retorna 400 com whatsapp inválido', async () => {
    const res = await request(app).post('/api/criar-pagamento').send({ ...VALID_BODY, whatsapp: '123' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retorna 400 sem fotoIds', async () => {
    const res = await request(app).post('/api/criar-pagamento').send({ whatsapp: '11999999999', fotoIds: [] });
    expect(res.status).toBe(400);
  });

  it('rejeita GET com 405', async () => {
    const res = await request(app).get('/api/criar-pagamento');
    expect(res.status).toBe(405);
  });
});
