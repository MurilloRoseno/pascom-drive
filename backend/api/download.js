const crypto = require('crypto');
const { z } = require('zod');
const { verifyToken } = require('../lib/jwt-utils');
const { prepararDownload, registrarUsoDownload } = require('../lib/google-sheets');
const { downloadFile } = require('../lib/google-drive');
const {
  applyForensicWatermark,
  createFingerprintId,
  hashFingerprint,
} = require('../lib/forensic-watermark');

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
    const authorized = await prepararDownload(payload.downloadId, tokenHash);
    if (!authorized) return res.status(410).json({ error: 'Link expirado ou limite de uso atingido.' });
    const forensicSecret = process.env.FORENSIC_WATERMARK_SECRET;
    if (!forensicSecret) return res.status(500).json({ error: 'Configuracao de servidor invalida' });
    const { buffer, mimeType } = await downloadFile(authorized.originalFileId);
    const fingerprintId = authorized.fingerprintId || createFingerprintId(forensicSecret, {
      pedidoId: authorized.pedidoId,
      fotoId: authorized.fotoId,
      downloadId: authorized.downloadId,
    });
    let output;
    try {
      output = await applyForensicWatermark(buffer, { fingerprintId, mimeType });
    } catch (error) {
      console.error(JSON.stringify({
        event: 'forensic_download_failed',
        downloadId: authorized.downloadId,
        fotoId: authorized.fotoId,
        message: error.message,
        ts: new Date().toISOString(),
      }));
      return res.status(503).json({ error: 'Nao foi possivel preparar o download agora. Tente novamente.' });
    }
    await registrarUsoDownload(payload.downloadId, tokenHash, {
      fingerprintId,
      fingerprintHash: hashFingerprint(fingerprintId),
      fingerprintVersion: output.fingerprintVersion,
      status: 'Aplicado',
      appliedAt: new Date().toISOString(),
    });
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', output.mimeType);
    const extension = output.mimeType === 'image/png' ? 'png' : 'jpg';
    res.setHeader('Content-Disposition', `attachment; filename="foto-${authorized.fotoId}.${extension}"`);
    res.setHeader('X-Content-Protection', 'forensic-fingerprint');
    return res.end(output.buffer);
  } catch (error) {
    if (/assinatura|Token/i.test(error.message)) return res.status(401).json({ error: 'Link invalido.' });
    next(error);
  }
};
