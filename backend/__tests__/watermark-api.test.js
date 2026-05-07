// watermark-api.test.js
jest.mock('../lib/google-drive');
jest.mock('../lib/watermark-processor');

const request = require('supertest');
const express = require('express');
const watermarkHandler = require('../api/watermark');
const googleDrive = require('../lib/google-drive');
const { compositeWatermark } = require('../lib/watermark-processor');
const errorHandler = require('../middleware/error-handler');

const app = express();
app.use(express.json());
app.all('/api/watermark', watermarkHandler);
app.use(errorHandler);

const VALID_BODY = { fileId: 'file-abc-123' };
const FAKE_JPEG  = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG magic bytes

beforeEach(() => {
  jest.clearAllMocks();
  googleDrive.downloadFile.mockResolvedValue({
    buffer: Buffer.from('fake-image'),
    mimeType: 'image/jpeg',
  });
  compositeWatermark.mockResolvedValue(FAKE_JPEG);
});

describe('POST /api/watermark', () => {
  it('returns 200 with image/jpeg content-type on valid request', async () => {
    const res = await request(app).post('/api/watermark').send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('returns the watermarked image as binary body', async () => {
    const res = await request(app).post('/api/watermark').send(VALID_BODY);
    expect(Buffer.from(res.body)).toEqual(FAKE_JPEG);
  });

  it('calls downloadFile with the provided fileId', async () => {
    await request(app).post('/api/watermark').send(VALID_BODY);
    expect(googleDrive.downloadFile).toHaveBeenCalledWith('file-abc-123');
  });

  it('uses color watermark by default', async () => {
    await request(app).post('/api/watermark').send(VALID_BODY);
    expect(compositeWatermark).toHaveBeenCalledWith(expect.any(Buffer), 'color');
  });

  it('accepts watermarkType bw', async () => {
    await request(app).post('/api/watermark').send({ ...VALID_BODY, watermarkType: 'bw' });
    expect(compositeWatermark).toHaveBeenCalledWith(expect.any(Buffer), 'bw');
  });

  it('returns 400 when fileId is missing', async () => {
    const res = await request(app).post('/api/watermark').send({});
    expect(res.status).toBe(400);
  });

  it('returns 405 for GET requests', async () => {
    const res = await request(app).get('/api/watermark');
    expect(res.status).toBe(405);
  });
});
