jest.mock('../lib/categorias', () => ({ listarCategorias: jest.fn() }));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const handler = require('../api/categorias');
const { listarCategorias } = require('../lib/categorias');

const app = express();
app.all('/api/categorias', handler);
app.use(errorHandler);

describe('GET /api/categorias', () => {
  it('devolve só id, nome e tipo das ativas, sem contagem de eventos nem ordem', async () => {
    listarCategorias.mockResolvedValue([
      { id: 'batismo', nome: 'Batismo', tipo: 'sacramento', ordem: 2, ativo: true, padrao: false, eventos: 9 },
    ]);
    const r = await request(app).get('/api/categorias');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([{ id: 'batismo', nome: 'Batismo', tipo: 'sacramento' }]);
    expect(listarCategorias).toHaveBeenCalledWith();
  });

  it('só aceita GET', async () => {
    expect((await request(app).post('/api/categorias')).status).toBe(405);
  });
});
