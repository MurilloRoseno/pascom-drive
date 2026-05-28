jest.mock('../lib/google-sheets', () => ({
  prepararDownload: jest.fn(),
  registrarUsoDownload: jest.fn(),
}));
jest.mock('../lib/google-drive', () => ({
  downloadFile: jest.fn().mockResolvedValue({ buffer: Buffer.from('fake-jpeg'), mimeType: 'image/jpeg' }),
}));
jest.mock('../lib/forensic-watermark', () => ({
  applyForensicWatermark: jest.fn(async (buffer) => ({ buffer: Buffer.concat([buffer, Buffer.from('-fp')]), mimeType: 'image/jpeg', fingerprintVersion: 'pascom-v1' })),
  createFingerprintId: jest.fn(() => 'fp-id'),
  hashFingerprint: jest.fn(() => 'fp-hash'),
}));

const SECRET = 'test-secret';
process.env.DOWNLOAD_JWT_SECRET = SECRET;
process.env.FORENSIC_WATERMARK_SECRET = 'forensic-secret';

const { signToken } = require('../lib/jwt-utils');
const request = require('supertest');
const express = require('express');
const handler = require('../api/download');
const sheets = require('../lib/google-sheets');
const forensic = require('../lib/forensic-watermark');

const app = express();
app.get('/api/download', handler);

function token(overrides = {}) {
  return signToken({ downloadId: 'DL_001', exp: Date.now() + 60000, ...overrides }, SECRET);
}

beforeEach(() => {
  jest.clearAllMocks();
  sheets.prepararDownload.mockResolvedValue({
    downloadId: 'DL_001',
    pedidoId: 'PED_001',
    originalFileId: 'PRIVATE_ORIGINAL',
    fotoId: 'FOTO_001',
    fingerprintId: 'fp-id',
  });
  sheets.registrarUsoDownload.mockResolvedValue(true);
});

it('entrega copia fingerprinted apenas ao token persistido valido', async () => {
  const res = await request(app).get(`/api/download?token=${token()}`);
  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toContain('no-store');
  expect(res.headers['x-content-protection']).toBe('forensic-fingerprint');
  expect(sheets.prepararDownload).toHaveBeenCalledWith('DL_001', expect.any(String));
  expect(forensic.applyForensicWatermark).toHaveBeenCalledWith(Buffer.from('fake-jpeg'), expect.objectContaining({ fingerprintId: 'fp-id' }));
  expect(sheets.registrarUsoDownload).toHaveBeenCalledWith('DL_001', expect.any(String), expect.objectContaining({
    fingerprintId: 'fp-id',
    fingerprintHash: 'fp-hash',
  }));
});

it('bloqueia token expirado antes de consultar arquivo', async () => {
  const res = await request(app).get(`/api/download?token=${token({ exp: Date.now() - 1 })}`);
  expect(res.status).toBe(401);
  expect(sheets.prepararDownload).not.toHaveBeenCalled();
});

it('bloqueia link consumido ou revogado na persistencia', async () => {
  sheets.prepararDownload.mockResolvedValueOnce(null);
  expect((await request(app).get(`/api/download?token=${token()}`)).status).toBe(410);
});

it('nao consome uso quando fingerprint falha', async () => {
  forensic.applyForensicWatermark.mockRejectedValueOnce(new Error('sharp failed'));
  const res = await request(app).get(`/api/download?token=${token()}`);
  expect(res.status).toBe(503);
  expect(sheets.registrarUsoDownload).not.toHaveBeenCalled();
});
