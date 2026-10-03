const request = require('supertest');

jest.mock('../api/assistente', () => (_req, res) => res.json({ ok: true }));

const app = require('../server');

it('o assistente aceita 20 mensagens por hora por visitante e a 21ª recebe 429 em português', async () => {
  for (let i = 0; i < 20; i += 1) {
    const r = await request(app).post('/api/assistente').send({ mensagem: 'oi' });
    expect(r.status).toBe(200);
  }
  const bloqueada = await request(app).post('/api/assistente').send({ mensagem: 'oi' });
  expect(bloqueada.status).toBe(429);
  expect(bloqueada.body.error).toMatch(/muitas perguntas/i);
});
