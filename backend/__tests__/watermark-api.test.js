// watermark-api.test.js
jest.mock('../lib/google-drive');
jest.mock('../lib/watermark-processor');

process.env.WATERMARK_API_SECRET = 'test-watermark-secret';
process.env.APPS_SCRIPT_HMAC_SECRET = 'apps-script-hmac-test';

const request = require('supertest');
const express = require('express');
const watermarkHandler = require('../api/watermark');
const googleDrive = require('../lib/google-drive');
const { compositeWatermark } = require('../lib/watermark-processor');
const errorHandler = require('../middleware/error-handler');
const { workerHeaders } = require('../test-helpers/worker-signature');

const app = express();
app.use(express.json());
app.all('/api/watermark', watermarkHandler);
app.use(errorHandler);

const VALID_BODY = { fileId: 'file-abc-123' };
const FAKE_JPEG  = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG magic bytes

function authorizedPost(body = VALID_BODY) {
  return request(app)
    .post('/api/watermark')
    .set(workerHeaders({ path: '/api/watermark', body }))
    .send(body);
}

let warnSpy;
beforeEach(() => {
  delete process.env.ALLOW_LEGACY_WORKER_SECRET;
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.clearAllMocks();
  googleDrive.downloadFile.mockResolvedValue({
    buffer: Buffer.from('fake-image'),
    mimeType: 'image/jpeg',
  });
  compositeWatermark.mockResolvedValue(FAKE_JPEG);
});
afterEach(() => {
  warnSpy.mockRestore();
});

describe('POST /api/watermark', () => {
  it('returns 200 with image/jpeg content-type on valid request', async () => {
    const res = await authorizedPost();
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('returns the watermarked image as binary body', async () => {
    const res = await authorizedPost();
    expect(Buffer.from(res.body)).toEqual(FAKE_JPEG);
  });

  it('calls downloadFile with the provided fileId', async () => {
    await authorizedPost();
    expect(googleDrive.downloadFile).toHaveBeenCalledWith('file-abc-123');
  });

  it('uses automatic watermark selection by default', async () => {
    await authorizedPost();
    expect(compositeWatermark).toHaveBeenCalledWith(expect.any(Buffer), 'auto', 'preview', { seed: 'file-abc-123' });
  });

  it('accepts watermarkType bw', async () => {
    await authorizedPost({ ...VALID_BODY, watermarkType: 'bw' });
    expect(compositeWatermark).toHaveBeenCalledWith(expect.any(Buffer), 'bw', 'preview', { seed: 'file-abc-123' });
  });

  it('gera miniatura otimizada quando solicitada', async () => {
    await authorizedPost({ ...VALID_BODY, variant: 'thumbnail' });
    expect(compositeWatermark).toHaveBeenCalledWith(expect.any(Buffer), 'auto', 'thumbnail', { seed: 'file-abc-123' });
  });

  it('returns 400 when fileId is missing', async () => {
    const res = await authorizedPost({});
    expect(res.status).toBe(400);
  });

  it('returns 405 for GET requests', async () => {
    const res = await request(app).get('/api/watermark');
    expect(res.status).toBe(405);
  });

  it('retorna 401 sem assinatura HMAC', async () => {
    const res = await request(app).post('/api/watermark').send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it('retorna 401 com assinatura HMAC errada', async () => {
    const res = await request(app)
      .post('/api/watermark')
      .set('x-pascom-timestamp', String(Date.now()))
      .set('x-pascom-signature', 'wrong-signature')
      .send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it('loga evento worker_signature_invalid ao retornar 401', async () => {
    const res = await request(app).post('/api/watermark').send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(warnSpy).toHaveBeenCalled();
    const logArg = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(logArg.event).toBe('worker_signature_invalid');
  });

  it('aceita segredo legado somente quando fallback esta habilitado', async () => {
    process.env.ALLOW_LEGACY_WORKER_SECRET = 'true';
    const res = await request(app)
      .post('/api/watermark')
      .set('x-watermark-secret', 'test-watermark-secret')
      .send(VALID_BODY);
    expect(res.status).toBe(200);
    delete process.env.ALLOW_LEGACY_WORKER_SECRET;
  });
});
