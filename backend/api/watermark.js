// watermark.js — POST /api/watermark
// Receives { fileId, filename, destFolderId, watermarkType? }
// Downloads photo from Drive, applies watermark, uploads to AMOSTRAS folder.
const { z } = require('zod');
const { downloadFile, uploadFile } = require('../lib/google-drive');
const { compositeWatermark } = require('../lib/watermark-processor');

const schema = z.object({
  fileId:        z.string().min(1),
  filename:      z.string().min(1),
  destFolderId:  z.string().min(1),
  watermarkType: z.enum(['color', 'bw']).default('color'),
});

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const params = schema.parse(req.body);
    const { buffer, mimeType } = await downloadFile(params.fileId);
    const watermarked = await compositeWatermark(buffer, params.watermarkType);
    // Output is always JPEG (quality 85) regardless of input type
    const linkAmostra = await uploadFile(watermarked, mimeType, params.filename, params.destFolderId);
    res.json({ linkAmostra });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    }
    next(err);
  }
};
