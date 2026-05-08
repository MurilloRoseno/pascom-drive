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
  });

  it('returns 401 for an invalid signature', async () => {
    const token = signToken({ fotoId: 'FOTO_001', whatsapp: '11999999999', exp: Date.now() + 60_000, used: false }, 'wrong-secret');
    const res = await request(app).get(`/api/download?token=${token}`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app).get('/api/download');
    expect(res.status).toBe(400);
  });

  it('returns 410 when token has used=true', async () => {
    const token = makeToken({ used: true });
    const res = await request(app).get(`/api/download?token=${token}`);
    expect(res.status).toBe(410);
  });
});
