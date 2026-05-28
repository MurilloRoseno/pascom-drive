jest.mock('../lib/google-drive');
jest.mock('sharp');

process.env.WATERMARK_API_SECRET = 'test-secret';
process.env.APPS_SCRIPT_HMAC_SECRET = 'apps-script-hmac-test';

const request   = require('supertest');
const express   = require('express');
const handler   = require('../api/preprocess');
const drive     = require('../lib/google-drive');
const sharp     = require('sharp');
const errorHandler = require('../middleware/error-handler');
const { workerHeaders } = require('../test-helpers/worker-signature');

const app = express();
app.use(express.json());
app.all('/api/preprocess', handler);
app.use(errorHandler);

const SMALL_JPEG = Buffer.alloc(1024 * 100); // 100 KB — below 2 MB threshold

function authorizedPost(body = { fileId: 'f1' }) {
  return request(app)
    .post('/api/preprocess')
    .set(workerHeaders({ path: '/api/preprocess', body }))
    .send(body);
}

// Mock Sharp chain: .rotate().resize().jpeg().withMetadata().toBuffer()
function mockSharpChain(outputBuffer) {
  const chain = {
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    jpeg:   jest.fn().mockReturnThis(),
    withMetadata: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(outputBuffer),
  };
  sharp.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  drive.downloadFile.mockResolvedValue({ buffer: Buffer.alloc(1024 * 1024 * 5), mimeType: 'image/png' });
  drive.downloadFileAsJpeg.mockResolvedValue({ buffer: Buffer.alloc(1024 * 1024 * 3), mimeType: 'image/jpeg' });
  drive.updateFile.mockResolvedValue(undefined);
  mockSharpChain(Buffer.alloc(1024 * 500)); // 500 KB output
});

describe('POST /api/preprocess', () => {
  it('returns 401 without secret header', async () => {
    const res = await request(app).post('/api/preprocess').send({ fileId: 'f1' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when fileId is missing', async () => {
    const res = await authorizedPost({});
    expect(res.status).toBe(400);
  });

  it('returns 405 for GET', async () => {
    const res = await request(app).get('/api/preprocess');
    expect(res.status).toBe(405);
  });

  it('downloads the file by fileId', async () => {
    await authorizedPost();
    expect(drive.downloadFile).toHaveBeenCalledWith('f1');
  });

  it('converts PNG and calls updateFile with image/jpeg', async () => {
    await authorizedPost();
    expect(drive.updateFile).toHaveBeenCalledWith('f1', expect.any(Buffer), 'image/jpeg');
  });

  it('returns JSON with originalSize, processedSize, skipped:false', async () => {
    const res = await authorizedPost();
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(false);
    expect(typeof res.body.originalSize).toBe('number');
    expect(typeof res.body.processedSize).toBe('number');
  });

  it('skips small JPEG (< 2 MB) without calling updateFile', async () => {
    drive.downloadFile.mockResolvedValue({ buffer: SMALL_JPEG, mimeType: 'image/jpeg' });
    const res = await authorizedPost();
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
    expect(drive.updateFile).not.toHaveBeenCalled();
  });

  it('returns 422 for unsupported format (camera RAW)', async () => {
    drive.downloadFile.mockResolvedValue({ buffer: Buffer.alloc(1000), mimeType: 'image/x-canon-cr2' });
    const res = await authorizedPost();
    expect(res.status).toBe(422);
  });

  it('converte image/heic via Google Drive thumbnailLink (não usa sharp direto)', async () => {
    drive.downloadFile.mockResolvedValue({
      buffer: Buffer.alloc(1024 * 1024 * 4),
      mimeType: 'image/heic',
    });
    const res = await request(app)
      .post('/api/preprocess')
      .set(workerHeaders({ path: '/api/preprocess', body: { fileId: 'f-heic' } }))
      .send({ fileId: 'f-heic' });
    expect(res.status).toBe(200);
    expect(drive.downloadFileAsJpeg).toHaveBeenCalledWith('f-heic');
    expect(drive.updateFile).toHaveBeenCalledWith('f-heic', expect.any(Buffer), 'image/jpeg');
  });

  it('converte image/heif via Google Drive thumbnailLink', async () => {
    drive.downloadFile.mockResolvedValue({
      buffer: Buffer.alloc(1024 * 1024 * 4),
      mimeType: 'image/heif',
    });
    const res = await request(app)
      .post('/api/preprocess')
      .set(workerHeaders({ path: '/api/preprocess', body: { fileId: 'f-heif' } }))
      .send({ fileId: 'f-heif' });
    expect(res.status).toBe(200);
    expect(drive.downloadFileAsJpeg).toHaveBeenCalledWith('f-heif');
    expect(drive.updateFile).toHaveBeenCalledWith('f-heif', expect.any(Buffer), 'image/jpeg');
  });

  it('converte image/heic-sequence (Live Photo) via Google Drive thumbnailLink', async () => {
    drive.downloadFile.mockResolvedValue({
      buffer: Buffer.alloc(1024 * 1024 * 6),
      mimeType: 'image/heic-sequence',
    });
    const res = await request(app)
      .post('/api/preprocess')
      .set(workerHeaders({ path: '/api/preprocess', body: { fileId: 'f-live' } }))
      .send({ fileId: 'f-live' });
    expect(res.status).toBe(200);
    expect(drive.downloadFileAsJpeg).toHaveBeenCalledWith('f-live');
    expect(drive.updateFile).toHaveBeenCalledWith('f-live', expect.any(Buffer), 'image/jpeg');
  });

  it('NÃO chama downloadFileAsJpeg para PNG comum', async () => {
    await request(app)
      .post('/api/preprocess')
      .set(workerHeaders({ path: '/api/preprocess', body: { fileId: 'f-png' } }))
      .send({ fileId: 'f-png' });
    expect(drive.downloadFileAsJpeg).not.toHaveBeenCalled();
  });
});
