const sharp = require('sharp');
const { downloadFile, updateFile } = require('../lib/google-drive');

const SUPPORTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
  'image/gif', 'image/avif', 'image/heic', 'image/heif',
  'image/heic-sequence', // iPhone Live Photos
]);
const SMALL_JPEG_THRESHOLD = 2 * 1024 * 1024; // 2 MB

function sendJson(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const secret = process.env.WATERMARK_API_SECRET;
  if (!secret || req.headers['x-watermark-secret'] !== secret) {
    console.warn(JSON.stringify({ event: 'preprocess_unauthorized', ip: req.ip, ts: new Date().toISOString() }));
    return sendJson(res, 401, { error: 'Não autorizado' });
  }

  const { fileId } = req.body || {};
  if (!fileId) return sendJson(res, 400, { error: 'fileId obrigatório' });

  try {
    const { buffer, mimeType } = await downloadFile(fileId);
    const originalSize = buffer.length;

    if (!SUPPORTED.has(mimeType)) {
      return sendJson(res, 422, { error: `Formato não suportado: ${mimeType}` });
    }

    // Skip small JPEGs — already optimal
    if (mimeType === 'image/jpeg' && originalSize < SMALL_JPEG_THRESHOLD) {
      return sendJson(res, 200, { skipped: true, originalSize, processedSize: originalSize, originalMimeType: mimeType });
    }

    const processed = await sharp(buffer)
      .rotate()                                         // auto-orient from EXIF
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
