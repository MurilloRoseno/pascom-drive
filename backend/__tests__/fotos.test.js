jest.mock('../lib/google-sheets', () => ({
  listarFotos: jest.fn().mockResolvedValue([
    { id: 'FOTO_001', event: 'Missa de Páscoa', url: 'https://example.com/a.jpg', price: 25 },
    { id: 'FOTO_002', event: 'Missa de Páscoa', url: 'https://example.com/b.jpg', price: 25 },
  ]),
}));

const request = require('supertest');
const express = require('express');
const fotosHandler = require('../api/fotos');

const app = express();
app.use(express.json());
app.all('/api/fotos', fotosHandler);

describe('GET /api/fotos', () => {
  it('retorna 200 com array de fotos', async () => {
    const res = await request(app).get('/api/fotos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('cada foto tem id, event, url, price', async () => {
    const res = await request(app).get('/api/fotos');
    const foto = res.body[0];
    expect(foto).toHaveProperty('id');
    expect(foto).toHaveProperty('event');
    expect(foto).toHaveProperty('url');
    expect(foto).toHaveProperty('price');
  });

  it('rejeita POST com 405', async () => {
    const res = await request(app).post('/api/fotos');
    expect(res.status).toBe(405);
  });
});
