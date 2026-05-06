const crypto = require('crypto');

jest.mock('../lib/google-sheets', () => ({
  atualizarStatus: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/mercado-pago', () => ({
  validarHmac: jest.requireActual('../lib/mercado-pago').validarHmac,
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');

const WEBHOOK_SECRET = 'test_secret_123';
process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;

// require after env is set
const webhookHandler = require('../api/webhook/mercado-pago');

const app = express();
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); },
}));
app.post('/api/webhook/mercado-pago', webhookHandler);
app.use(errorHandler);

function makeSignature(body) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

describe('POST /api/webhook/mercado-pago', () => {
  const body = JSON.stringify({ action: 'payment.updated', data: { id: 'MP_123' } });

  it('retorna 200 com assinatura válida', async () => {
    const sig = makeSignature(body);
    const res = await request(app)
      .post('/api/webhook/mercado-pago')
      .set('Content-Type', 'application/json')
      .set('x-signature', sig)
      .send(body);
    expect(res.status).toBe(200);
  });

  it('retorna 401 com assinatura inválida', async () => {
    const res = await request(app)
      .post('/api/webhook/mercado-pago')
      .set('x-signature', 'assinatura_invalida')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('retorna 401 sem header x-signature', async () => {
    const res = await request(app)
      .post('/api/webhook/mercado-pago')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('retorna 200 idempotente para mesmo x-request-id', async () => {
    const { atualizarStatus } = require('../lib/google-sheets');
    atualizarStatus.mockClear();

    const sig = makeSignature(body);
    await request(app)
      .post('/api/webhook/mercado-pago')
      .set('Content-Type', 'application/json')
      .set('x-signature', sig)
      .set('x-request-id', 'REQ_IDEM_UNICO')
      .send(body);
    const res2 = await request(app)
      .post('/api/webhook/mercado-pago')
      .set('Content-Type', 'application/json')
      .set('x-signature', sig)
      .set('x-request-id', 'REQ_IDEM_UNICO')
      .send(body);
    expect(res2.status).toBe(200);
    expect(atualizarStatus).toHaveBeenCalledTimes(1);
  });
});
