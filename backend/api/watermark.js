// watermark.js — POST /api/watermark
// Receives { fileId, watermarkType? }
// Downloads photo from Drive, applies watermark, returns raw JPEG binary.
// The caller (Apps Script) saves the returned blob to Drive as the authenticated user,
// avoiding the "Service Accounts do not have storage quota" limitation.
const { z } = require('zod');
const { downloadFile } = require('../lib/google-drive');
const { compositeWatermark } = require('../lib/watermark-processor');

const schema = z.object({
  fileId:        z.string().min(1),
  watermarkType: z.enum(['color', 'bw']).default('color'),
});

// Use only native Node.js ServerResponse methods (setHeader/writeHead/end).
// Vercel calls this file directly as a Function without Express middleware,
// so res.set(), res.send(), res.status(), res.json() are not available.
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const secret = process.env.WATERMARK_API_SECRET;
  if (!secret || req.headers['x-watermark-secret'] !== secret) {
    return sendJson(res, 401, { error: 'Não autorizado' });
  }
  try {
    const params = schema.parse(req.body);
    const { buffer } = await downloadFile(params.fileId);
    const watermarked = await compositeWatermark(buffer, params.watermarkType);
    // Return raw JPEG — caller (Apps Script) saves blob to Drive as the user (who has quota)
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(watermarked);
  } catch (err) {
    console.error('[watermark] Error:', err.message, err.stack);
    if (err.name === 'ZodError') {
      return sendJson(res, 400, { error: 'Dados inválidos', details: err.errors });
    }
    if (typeof next === 'function') return next(err);
    return sendJson(res, 500, { error: err.message || 'Erro interno ao processar watermark' });
  }
};
