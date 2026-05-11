// download.test.js
jest.mock('../lib/google-drive', () => ({
  downloadFile: jest.fn().mockResolvedValue({ buffer: Buffer.from('fake-jpeg'), mimeType: 'image/jpeg' }),
}));

const SECRET = 'test-secret';
process.env.DOWNLOAD_JWT_SECRET = SECRET;

const { signToken } = require('../lib/jwt-utils');
const request = require('supertest');
const express = require('express');
const downloadHandler = require('../api/download');
const errorHandler = require('../middleware/error-handler');

const app = express();
app.use(express.json());
app.get('/api/download', downloadHandler);
app.use(errorHandler);

function makeToken(overrides = {}) {
  const payload = {
    fotoId: 'FOTO_001',
    whatsapp: '11999999999',
    exp: Date.now() + 60_000,
    used: false,
    ...overrides,
  };
  return signToken(payload, SECRET);
}

describe('GET /api/download', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns 200 with image/jpeg for a valid token', async () => {
    const token = makeToken();
    const res = await request(app).get(`/api/download?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('returns 401 for an expired token', async () => {
    const token = makeToken({ exp: Date.now() - 1000 });
    const res = await request(app).get(`/api/download?token=${token}`);
    expect(res.status).toBe(401);
    expect(warnSpy).toHaveBeenCalled();
    const log = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(log.event).toBe('download_invalid_token');
  });

  it('returns 401 for an invalid signature', async () => {
    const token = signToken({ fotoId: 'FOTO_001', whatsapp: '11999999999', exp: Date.now() + 60_000, used: false }, 'wrong-secret');
    const res = await request(app).get(`/api/download?token=${token}`);
    expect(res.status).toBe(401);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app).get('/api/download');
    expect(res.status).toBe(400);
  });

  it('returns 410 when token has used=true', async () => {
    const token = makeToken({ used: true });
    const res = await request(app).get(`/api/download?token=${token}`);
    expect(res.status).toBe(410);
    expect(warnSpy).toHaveBeenCalled();
    const log410 = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(log410.event).toBe('download_token_reuse');
  });

  it('returns 500 if DOWNLOAD_JWT_SECRET is not configured', async () => {
    const original = process.env.DOWNLOAD_JWT_SECRET;
    delete process.env.DOWNLOAD_JWT_SECRET;
    const res = await request(app).get('/api/download?token=validtokenplaceholder');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Configuração de servidor inválida');
    process.env.DOWNLOAD_JWT_SECRET = original;
  });
});
