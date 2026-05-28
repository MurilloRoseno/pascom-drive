const sharp = require('sharp');
const { z } = require('zod');
const { downloadFile } = require('../lib/google-drive');
const { authorizeWorker } = require('../lib/worker-auth');

const schema = z.object({
  fileId: z.string().min(1),
  variant: z.enum(['preview', 'thumbnail']).default('preview'),
});

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!authorizeWorker(req, {
    legacyHeader: 'x-watermark-secret',
    legacySecret: process.env.WATERMARK_API_SECRET,
  })) {
    return sendJson(res, 401, { error: 'Nao autorizado' });
  }
  try {
    const { fileId, variant } = schema.parse(req.body);
    const output = variant === 'thumbnail'
      ? { size: 480, quality: 76 }
      : { size: 1280, quality: 84 };
    const { buffer } = await downloadFile(fileId);
    const preview = await sharp(buffer)
      .rotate()
      .resize(output.size, output.size, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: output.quality, mozjpeg: true })
      .toBuffer();
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    return res.end(preview);
  } catch (error) {
    if (error.name === 'ZodError') return sendJson(res, 400, { error: 'Dados invalidos' });
    if (typeof next === 'function') return next(error);
    return sendJson(res, 500, { error: 'Falha ao preparar capa' });
  }
};
