// download.js — GET /api/download?token=<jwt>
// Returns the original photo file streamed from Google Drive.
// The JWT must be signed with DOWNLOAD_JWT_SECRET, not expired, and not marked used.
const { z } = require('zod');
const { verifyToken } = require('../lib/jwt-utils');
const { downloadFile } = require('../lib/google-drive');

const schema = z.object({
  token: z.string().min(10),
});

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const params = schema.parse(req.query);
    const secret = process.env.DOWNLOAD_JWT_SECRET;

    let payload;
    try {
      payload = verifyToken(params.token, secret);
    } catch (_err) {
      return sendJson(res, 401, { error: 'Token inválido ou assinatura incorreta' });
    }

    if (Date.now() > payload.exp) {
      return sendJson(res, 401, { error: 'Token expirado' });
    }

    if (payload.used === true) {
      return sendJson(res, 410, { error: 'Token já utilizado' });
    }

    const { buffer } = await downloadFile(payload.fotoId);

    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="foto-${payload.fotoId}.jpg"`,
    });
    res.end(buffer);
  } catch (err) {
    console.error('[download] Error:', err.message, err.stack);
    if (err.name === 'ZodError') {
      return sendJson(res, 400, { error: 'Parâmetros inválidos', details: err.errors });
    }
    if (typeof next === 'function') return next(err);
    return sendJson(res, 500, { error: err.message || 'Erro interno ao processar download' });
  }
};
