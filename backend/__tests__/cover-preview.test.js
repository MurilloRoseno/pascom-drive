jest.mock('../lib/google-drive');
jest.mock('sharp');

process.env.WATERMARK_API_SECRET = 'test-secret';
process.env.APPS_SCRIPT_HMAC_SECRET = 'apps-script-hmac-test';

const request = require('supertest');
const express = require('express');
const handler = require('../api/cover-preview');
const drive = require('../lib/google-drive');
const sharp = require('sharp');
const errorHandler = require('../middleware/error-handler');
const { workerHeaders } = require('../test-helpers/worker-signature');

const app = express();
app.use(express.json());
app.all('/api/cover-preview', handler);
app.use(errorHandler);

beforeEach(() => {
  jest.clearAllMocks();
  drive.downloadFile.mockResolvedValue({ buffer: Buffer.from('image'), mimeType: 'image/jpeg' });
  sharp.mockReturnValue({
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('cover')),
  });
});

it('gera capa reduzida sem chamar o processador de marca dagua', async () => {
  const response = await request(app)
    .post('/api/cover-preview')
    .set(workerHeaders({ path: '/api/cover-preview', body: { fileId: 'CAPA_ID' } }))
    .send({ fileId: 'CAPA_ID' });
  expect(response.status).toBe(200);
  expect(drive.downloadFile).toHaveBeenCalledWith('CAPA_ID');
  expect(sharp().resize).toHaveBeenCalledWith(1280, 1280, { fit: 'inside', withoutEnlargement: true });
});

it('gera thumbnail leve de capa para cards', async () => {
  const response = await request(app)
    .post('/api/cover-preview')
    .set(workerHeaders({ path: '/api/cover-preview', body: { fileId: 'CAPA_ID', variant: 'thumbnail' } }))
    .send({ fileId: 'CAPA_ID', variant: 'thumbnail' });
  expect(response.status).toBe(200);
  expect(sharp().resize).toHaveBeenCalledWith(480, 480, { fit: 'inside', withoutEnlargement: true });
});
