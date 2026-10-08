const request = require('supertest');
const express = require('express');
const { mediaAbuseGuard, resetMediaAbuseBuckets } = require('../middleware/media-abuse');

const app = express();
app.get('/api/eventos/:eventoId/previews/:fotoId', mediaAbuseGuard, (_req, res) => res.json({ ok: true }));

beforeEach(() => {
  resetMediaAbuseBuckets();
});

it('bloqueia padrao massivo de requisicoes de midia sem afetar outras rotas', async () => {
  for (let index = 0; index < 180; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    expect((await request(app).get('/api/eventos/EV1/previews/F1')).status).toBe(200);
  }
  const blocked = await request(app).get('/api/eventos/EV1/previews/F1');
  expect(blocked.status).toBe(429);
});
