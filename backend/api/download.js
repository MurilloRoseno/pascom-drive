const crypto = require('crypto');
const { z } = require('zod');
const { verifyToken } = require('../lib/jwt-utils');
const { consumirDownload } = require('../lib/google-sheets');
const { downloadFile } = require('../lib/google-drive');

const schema = z.object({ token: z.string().min(10) });

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const params = schema.safeParse(req.query);
  if (!params.success) return res.status(400).json({ error: 'Parametros invalidos.' });
  const secret = process.env.DOWNLOAD_JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuracao de servidor invalida' });
  try {
    const payload = verifyToken(params.data.token, secret);
    if (!payload.downloadId || payload.exp <= Date.now()) return res.status(401).json({ error: 'Link expirado.' });
    const tokenHash = crypto.createHash('sha256').update(params.data.token).digest('hex');
    const authorized = await consumirDownload(payload.downloadId, tokenHash);
    if (!authorized) return res.status(410).json({ error: 'Link expirado ou limite de uso atingido.' });
    const { buffer, mimeType } = await downloadFile(authorized.originalFileId);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', mimeType || 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="foto-${authorized.fotoId}.jpg"`);
    return res.end(buffer);
  } catch (error) {
    if (/assinatura|Token/i.test(error.message)) return res.status(401).json({ error: 'Link invalido.' });
    next(error);
  }
};
