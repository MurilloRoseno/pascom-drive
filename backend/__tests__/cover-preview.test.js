jest.mock('../lib/google-drive');
jest.mock('sharp');

process.env.WATERMARK_API_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');
const handler = require('../api/cover-preview');
const drive = require('../lib/google-drive');
const sharp = require('sharp');
const errorHandler = require('../middleware/error-handler');

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
    .set('x-watermark-secret', 'test-secret')
    .send({ fileId: 'CAPA_ID' });
  expect(response.status).toBe(200);
  expect(drive.downloadFile).toHaveBeenCalledWith('CAPA_ID');
  expect(sharp().resize).toHaveBeenCalledWith(1280, 1280, { fit: 'inside', withoutEnlargement: true });
});
