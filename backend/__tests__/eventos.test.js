jest.mock('../lib/google-sheets', () => ({
  listarEventosPublicados: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const handler = require('../api/eventos');
const sheets = require('../lib/google-sheets');
const errorHandler = require('../middleware/error-handler');

const app = express();
app.use(express.json());
app.get('/api/eventos', handler);
app.get('/api/eventos/:eventoId', handler);
app.use(errorHandler);

const event = { eventoId: 'EV1', title: 'Missa', publication: 'publicado', visibility: 'publica', cover: '/api/eventos/EV1/previews/F1' };

beforeEach(() => {
  jest.clearAllMocks();
  sheets.listarEventosPublicados.mockResolvedValue([event]);
});

it('lista somente eventos publicaveis com filtros encaminhados', async () => {
  const res = await request(app).get('/api/eventos?categoria=celebracoes&q=missa');
  expect(res.status).toBe(200);
  expect(res.body.eventos).toEqual([event]);
  expect(sheets.listarEventosPublicados).toHaveBeenCalledWith({ categoria: 'celebracoes', q: 'missa' });
  expect(res.headers['vercel-cdn-cache-control']).toContain('max-age=300');
});

it('nao retorna hash ou versao do codigo no detalhe publico', async () => {
  const res = await request(app).get('/api/eventos/EV1');
  expect(res.body.event.cover).toBe('/api/eventos/EV1/previews/F1');
});

it('usa capa editorial mesmo em galeria protegida', async () => {
  sheets.listarEventosPublicados.mockResolvedValueOnce([{ ...event, visibility: 'protegida', cover: '/api/eventos/EV1/previews/CAPA1' }]);
  const res = await request(app).get('/api/eventos/EV1');
  expect(res.body.event.cover).toBe('/api/eventos/EV1/previews/CAPA1');
});

it('nao exibe evento em rascunho', async () => {
  sheets.listarEventosPublicados.mockResolvedValueOnce([]);
  expect((await request(app).get('/api/eventos/EV2')).status).toBe(404);
});
