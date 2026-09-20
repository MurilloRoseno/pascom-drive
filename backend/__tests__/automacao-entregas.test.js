jest.mock('../lib/order-fulfillment', () => ({
  conciliarEntregas: jest.fn(),
}));

process.env.APPS_SCRIPT_HMAC_SECRET = 'apps-script-hmac-test';
process.env.WATERMARK_API_SECRET = 'watermark-legado';

const request = require('supertest');
const express = require('express');
const handler = require('../api/automacao-entregas');
const { conciliarEntregas } = require('../lib/order-fulfillment');
const { workerHeaders } = require('../test-helpers/worker-signature');

const ROTA = '/api/automacao/entregas';
const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.post(ROTA, handler);

const resumo = {
  verificados: 3, conciliados: 1, entregues: 1, reenviados: 0, parcial: false,
  problemas: [{ tipo: 'pago_sem_entrega', severidade: 'erro', motivo: 'Pago, mas sem nenhum link', pedidoId: 'PED_1' }],
  resumo: { erros: 1, avisos: 0 },
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.ALLOW_LEGACY_WORKER_SECRET;
  conciliarEntregas.mockResolvedValue(resumo);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

function post(body = {}) {
  return request(app).post(ROTA).send(body);
}

it('recusa a conciliacao sem assinatura de worker', async () => {
  const response = await post({ limiteMs: 15000 });
  expect(response.status).toBe(401);
  expect(conciliarEntregas).not.toHaveBeenCalled();
});

it('recusa assinatura com carimbo de tempo fora da janela', async () => {
  const body = { limiteMs: 15000 };
  const response = await request(app).post(ROTA)
    .set(workerHeaders({ path: ROTA, body, timestamp: Date.now() - 10 * 60 * 1000 }))
    .send(body);
  expect(response.status).toBe(401);
  expect(conciliarEntregas).not.toHaveBeenCalled();
});

it('roda a conciliacao com assinatura valida e nao deixa a resposta em cache', async () => {
  const body = { limiteMs: 15000, varredura: true };
  const response = await request(app).post(ROTA)
    .set(workerHeaders({ path: ROTA, body }))
    .send(body);

  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toContain('no-store');
  expect(response.body).toEqual(resumo);
  expect(conciliarEntregas).toHaveBeenCalledWith({ limiteMs: 15000, varredura: true });
});

it('aceita o segredo legado somente quando o fallback esta ligado', async () => {
  const semFallback = await request(app).post(ROTA).set('x-watermark-secret', 'watermark-legado').send({});
  expect(semFallback.status).toBe(401);

  process.env.ALLOW_LEGACY_WORKER_SECRET = 'true';
  const comFallback = await request(app).post(ROTA).set('x-watermark-secret', 'watermark-legado').send({});
  expect(comFallback.status).toBe(200);
});

it('recusa parametros invalidos', async () => {
  const body = { limiteMs: 90000 };
  const response = await request(app).post(ROTA)
    .set(workerHeaders({ path: ROTA, body }))
    .send(body);
  expect(response.status).toBe(400);
  expect(conciliarEntregas).not.toHaveBeenCalled();
});
