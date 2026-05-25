jest.mock('../lib/google-sheets', () => ({
  consumirDownload: jest.fn(),
}));
jest.mock('../lib/google-drive', () => ({
  downloadFile: jest.fn().mockResolvedValue({ buffer: Buffer.from('fake-jpeg'), mimeType: 'image/jpeg' }),
}));

const SECRET = 'test-secret';
process.env.DOWNLOAD_JWT_SECRET = SECRET;

const { signToken } = require('../lib/jwt-utils');
const request = require('supertest');
const express = require('express');
const handler = require('../api/download');
const sheets = require('../lib/google-sheets');

const app = express();
app.get('/api/download', handler);

function token(overrides = {}) {
  return signToken({ downloadId: 'DL_001', exp: Date.now() + 60000, ...overrides }, SECRET);
}

beforeEach(() => {
  jest.clearAllMocks();
  sheets.consumirDownload.mockResolvedValue({ originalFileId: 'PRIVATE_ORIGINAL', fotoId: 'FOTO_001' });
});

it('entrega arquivo privado apenas ao token persistido valido', async () => {
  const res = await request(app).get(`/api/download?token=${token()}`);
  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toContain('no-store');
  expect(sheets.consumirDownload).toHaveBeenCalledWith('DL_001', expect.any(String));
});

it('bloqueia token expirado antes de consultar arquivo', async () => {
  const res = await request(app).get(`/api/download?token=${token({ exp: Date.now() - 1 })}`);
  expect(res.status).toBe(401);
  expect(sheets.consumirDownload).not.toHaveBeenCalled();
});

it('bloqueia link consumido ou revogado na persistencia', async () => {
  sheets.consumirDownload.mockResolvedValueOnce(null);
  expect((await request(app).get(`/api/download?token=${token()}`)).status).toBe(410);
});
