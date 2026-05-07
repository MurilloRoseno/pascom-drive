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

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const params = schema.parse(req.body);
    const { buffer } = await downloadFile(params.fileId);
    const watermarked = await compositeWatermark(buffer, params.watermarkType);
    // Return raw JPEG — caller saves it to Drive (avoids service-account quota issue)
    res.set('Content-Type', 'image/jpeg').send(watermarked);
  } catch (err) {
    console.error('[watermark] Error:', err.message, err.stack);
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    }
    if (typeof next === 'function') return next(err);
    return res.status(500).json({ error: err.message || 'Erro interno ao processar watermark' });
  }
};
