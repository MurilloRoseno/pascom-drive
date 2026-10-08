const request = require('supertest');

jest.mock('../api/checkout-quote', () => (_req, res) => res.json({ ok: true }));
jest.mock('../api/checkout-preference', () => (_req, res) => res.json({ ok: true }));

const app = require('../server');

it('allows repeated quotes without consuming the stricter payment creation limit', async () => {
  for (let index = 0; index < 8; index += 1) {
    const response = await request(app).post('/api/checkout/quote').send({});
    expect(response.status).toBe(200);
  }

  for (let index = 0; index < 5; index += 1) {
    const response = await request(app).post('/api/checkout/preference').send({});
    expect(response.status).toBe(200);
  }

  const blocked = await request(app).post('/api/checkout/preference').send({});
  expect(blocked.status).toBe(429);
  expect(blocked.body.error).toMatch(/Limite de tentativas de pagamento/i);
});
