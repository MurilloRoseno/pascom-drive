jest.mock('../lib/google-sheets', () => ({
  buscarEvento: jest.fn(),
  listarFotosEvento: jest.fn().mockResolvedValue([{ id: 'F1', previewUrl: '/preview', price: 10 }]),
}));
jest.mock('../lib/gallery-access', () => ({
  tokenAllowsEvent: jest.fn(),
  verifyCode: jest.fn(),
  issueGalleryToken: jest.fn(() => 'SESSION_TOKEN'),
}));

const request = require('supertest');
const express = require('express');
const fotosHandler = require('../api/fotos-evento');
const acessoHandler = require('../api/galeria-acesso');
const sheets = require('../lib/google-sheets');
const access = require('../lib/gallery-access');

const app = express();
app.use(express.json());
app.get('/api/eventos/:eventoId/fotos', fotosHandler);
app.post('/api/eventos/:eventoId/acesso', acessoHandler);

const protectedEvent = {
  eventoId: 'EV_PROTEGIDO', publication: 'publicado', visibility: 'protegida',
  codeHash: 'hash', codeVersion: 2, title: 'Primeira Comunhao',
};

beforeEach(() => {
  jest.clearAllMocks();
  sheets.buscarEvento.mockResolvedValue(protectedEvent);
  access.tokenAllowsEvent.mockReturnValue(false);
  access.verifyCode.mockReturnValue(true);
});

it('nao lista previews protegidas sem sessao valida', async () => {
  const res = await request(app).get('/api/eventos/EV_PROTEGIDO/fotos');
  expect(res.status).toBe(401);
  expect(res.headers['cache-control']).toContain('no-store');
});

it('emite sessao temporaria sem devolver hash do codigo', async () => {
  const res = await request(app).post('/api/eventos/EV_PROTEGIDO/acesso').send({ code: 'ABCD1234' });
  expect(res.status).toBe(200);
  expect(res.body.token).toBe('SESSION_TOKEN');
  expect(res.body).not.toHaveProperty('codeHash');
});

it('devolve previews sem informacao secreta apos acesso permitido', async () => {
  access.tokenAllowsEvent.mockReturnValueOnce(true);
  const res = await request(app).get('/api/eventos/EV_PROTEGIDO/fotos').set('x-gallery-token', 'SESSION_TOKEN');
  expect(res.status).toBe(200);
  expect(res.body.event).not.toHaveProperty('codeHash');
  expect(res.body.photos).toHaveLength(1);
});
