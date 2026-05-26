const sharp = require('sharp');
const { z } = require('zod');
const { downloadFile } = require('../lib/google-drive');

const schema = z.object({ fileId: z.string().min(1) });

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const secret = process.env.WATERMARK_API_SECRET;
  if (!secret || req.headers['x-watermark-secret'] !== secret) {
    return sendJson(res, 401, { error: 'Nao autorizado' });
  }
  try {
    const { fileId } = schema.parse(req.body);
    const { buffer } = await downloadFile(fileId);
    const preview = await sharp(buffer)
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    return res.end(preview);
  } catch (error) {
    if (error.name === 'ZodError') return sendJson(res, 400, { error: 'Dados invalidos' });
    if (typeof next === 'function') return next(error);
    return sendJson(res, 500, { error: 'Falha ao preparar capa' });
  }
};
