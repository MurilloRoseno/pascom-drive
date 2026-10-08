const sharp = require('sharp');
const { downloadFile, downloadFileAsJpeg, updateFile } = require('../lib/google-drive');
const { authorizeWorker } = require('../lib/worker-auth');

const SUPPORTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
  'image/gif', 'image/avif', 'image/heic', 'image/heif',
  'image/heic-sequence', // iPhone Live Photos
]);
const SMALL_JPEG_THRESHOLD = 2 * 1024 * 1024; // 2 MB
const HEIC_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence']);

function sendJson(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  if (!authorizeWorker(req, {
    legacyHeader: 'x-watermark-secret',
    legacySecret: process.env.WATERMARK_API_SECRET,
  })) {
    return sendJson(res, 401, { error: 'Não autorizado' });
  }

  const { fileId } = req.body || {};
  if (!fileId) return sendJson(res, 400, { error: 'fileId obrigatório' });

  try {
    // 1. Download raw file to detect mimeType
    const { buffer, mimeType } = await downloadFile(fileId);
    const originalSize = buffer.length;

    if (!SUPPORTED.has(mimeType)) {
      return sendJson(res, 422, { error: `Formato não suportado: ${mimeType}` });
    }

    // Skip small JPEGs — already optimal
    if (mimeType === 'image/jpeg' && originalSize < SMALL_JPEG_THRESHOLD) {
      return sendJson(res, 200, { skipped: true, originalSize, processedSize: originalSize, originalMimeType: mimeType });
    }

    // For HEIC/HEIF: Vercel Lambda's libheif 2.x cannot decode HEVC (plugin .so files missing).
    // Use Google Drive's thumbnail service to get a JPEG — Google decodes HEIC natively.
    let workBuffer = buffer;
    if (HEIC_TYPES.has(mimeType)) {
      const jpeg = await downloadFileAsJpeg(fileId);
      workBuffer = jpeg.buffer;
    }

    const processed = await sharp(workBuffer)
      .rotate()
      .resize(5000, 5000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .withMetadata()
      .toBuffer();

    await updateFile(fileId, processed, 'image/jpeg');

    console.log(JSON.stringify({
      event: 'preprocess_done',
      fileId,
      originalMimeType: mimeType,
      originalSize,
      processedSize: processed.length,
      reductionPct: Math.round((1 - processed.length / originalSize) * 100),
      ts: new Date().toISOString(),
    }));

    return sendJson(res, 200, {
      skipped: false,
      originalMimeType: mimeType,
      originalSize,
      processedSize: processed.length,
    });
  } catch (err) {
    next(err);
  }
};
