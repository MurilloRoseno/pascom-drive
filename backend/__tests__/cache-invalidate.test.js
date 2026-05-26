jest.mock('../lib/runtime-cache', () => ({
  invalidateCacheTags: jest.fn().mockResolvedValue(),
}));

process.env.CACHE_INVALIDATION_SECRET = 'cache-secret-test';

const request = require('supertest');
const express = require('express');
const handler = require('../api/cache-invalidate');
const cache = require('../lib/runtime-cache');

const app = express();
app.use(express.json());
app.post('/api/admin/cache/invalidate', handler);

beforeEach(() => jest.clearAllMocks());

it('recusa invalidacao sem segredo administrativo', async () => {
  const response = await request(app).post('/api/admin/cache/invalidate').send({ scopes: ['catalogo'] });
  expect(response.status).toBe(401);
  expect(cache.invalidateCacheTags).not.toHaveBeenCalled();
});

it('invalida tags do evento e das imagens com segredo valido', async () => {
  const response = await request(app)
    .post('/api/admin/cache/invalidate')
    .set('x-cache-invalidation-secret', 'cache-secret-test')
    .send({ eventoId: 'EV1', scopes: ['catalogo', 'evento', 'media'] });
  expect(response.status).toBe(204);
  expect(cache.invalidateCacheTags).toHaveBeenCalledWith(['catalogo-eventos', 'evento-EV1', 'media-EV1']);
});
