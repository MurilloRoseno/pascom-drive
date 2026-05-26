jest.mock('../lib/google-sheets', () => ({
  buscarEvento: jest.fn(),
  buscarPreviewFoto: jest.fn(),
}));
jest.mock('../lib/gallery-access', () => ({
  tokenAllowsEvent: jest.fn(),
}));
jest.mock('../lib/google-drive', () => ({
  downloadFile: jest.fn(),
}));
jest.mock('../lib/runtime-cache', () => ({
  readThrough: jest.fn(async (_key, loader) => ({ value: await loader(), source: 'cache_miss' })),
}));

const request = require('supertest');
const express = require('express');
const handler = require('../api/preview-evento');
const sheets = require('../lib/google-sheets');
const access = require('../lib/gallery-access');
const drive = require('../lib/google-drive');

const app = express();
app.get('/api/eventos/:eventoId/previews/:fotoId', handler);

beforeEach(() => {
  jest.clearAllMocks();
  sheets.buscarEvento.mockResolvedValue({ eventoId: 'EV1', publication: 'publicado', visibility: 'protegida' });
  sheets.buscarPreviewFoto.mockResolvedValue({ derivativeFileId: 'PREVIEW_PRIVATE_ID', variant: 'preview' });
  access.tokenAllowsEvent.mockReturnValue(false);
  drive.downloadFile.mockResolvedValue({ buffer: Buffer.from('preview-bytes'), mimeType: 'image/jpeg' });
});

it('bloqueia preview de galeria protegida sem sessao', async () => {
  const response = await request(app).get('/api/eventos/EV1/previews/F1');
  expect(response.status).toBe(401);
  expect(drive.downloadFile).not.toHaveBeenCalled();
});

it('transmite somente a amostra do Drive apos acesso autorizado', async () => {
  access.tokenAllowsEvent.mockReturnValueOnce(true);
  const response = await request(app).get('/api/eventos/EV1/previews/F1?token=SESSION_TOKEN');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('image/jpeg');
  expect(response.headers['cache-control']).toContain('no-store');
  expect(drive.downloadFile).toHaveBeenCalledWith('PREVIEW_PRIVATE_ID');
});

it('transmite amostra real de evento publico sem exigir codigo', async () => {
  sheets.buscarEvento.mockResolvedValueOnce({ eventoId: 'EV1', publication: 'publicado', visibility: 'publica' });
  access.tokenAllowsEvent.mockReturnValueOnce(true);
  const response = await request(app).get('/api/eventos/EV1/previews/F1');
  expect(response.status).toBe(200);
  expect(drive.downloadFile).toHaveBeenCalledWith('PREVIEW_PRIVATE_ID');
});

it('transmite capa editorial publicada sem abrir as demais fotos protegidas', async () => {
  sheets.buscarPreviewFoto.mockResolvedValueOnce({ derivativeFileId: 'COVER_PRIVATE_ID', type: 'capa', variant: 'preview' });
  const response = await request(app).get('/api/eventos/EV1/previews/CAPA1');
  expect(response.status).toBe(200);
  expect(response.headers['vercel-cdn-cache-control']).toContain('max-age=86400');
  expect(drive.downloadFile).toHaveBeenCalledWith('COVER_PRIVATE_ID');
});
