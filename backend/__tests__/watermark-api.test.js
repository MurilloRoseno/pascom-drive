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

const VALID_BODY = {
  fileId: 'file-abc-123',
  filename: '[AMOSTRA]foto.jpg',
  destFolderId: 'folder-xyz-456',
};

beforeEach(() => {
  jest.clearAllMocks();
  googleDrive.downloadFile.mockResolvedValue({
    buffer: Buffer.from('fake-image'),
    mimeType: 'image/jpeg',
  });
  compositeWatermark.mockResolvedValue(Buffer.from('watermarked-image'));
  googleDrive.uploadFile.mockResolvedValue(
    'https://drive.google.com/file/d/new-id/view?usp=sharing'
  );
});

describe('POST /api/watermark', () => {
  it('returns 200 with linkAmostra on valid request', async () => {
    const res = await request(app).post('/api/watermark').send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      linkAmostra: 'https://drive.google.com/file/d/new-id/view?usp=sharing',
    });
  });

  it('calls downloadFile with the provided fileId', async () => {
    await request(app).post('/api/watermark').send(VALID_BODY);
    expect(googleDrive.downloadFile).toHaveBeenCalledWith('file-abc-123');
  });

  it('calls uploadFile with correct filename and destFolderId', async () => {
    await request(app).post('/api/watermark').send(VALID_BODY);
    expect(googleDrive.uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/jpeg',
      '[AMOSTRA]foto.jpg',
      'folder-xyz-456'
    );
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
    const res = await request(app)
      .post('/api/watermark')
      .send({ filename: 'x.jpg', destFolderId: 'folder' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when destFolderId is missing', async () => {
    const res = await request(app)
      .post('/api/watermark')
      .send({ fileId: 'abc', filename: 'x.jpg' });
    expect(res.status).toBe(400);
  });

  it('returns 405 for GET requests', async () => {
    const res = await request(app).get('/api/watermark');
    expect(res.status).toBe(405);
  });
});
