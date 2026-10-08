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

function logDownload(event, details = {}) {
  console.log(JSON.stringify({
    event,
    severity: details.severity || 'info',
    downloadId: details.downloadId || '',
    pedidoId: details.pedidoId || '',
    fotoId: details.fotoId || '',
    reason: details.reason || '',
    ts: new Date().toISOString(),
  }));
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const params = schema.safeParse(req.query);
  if (!params.success) {
    logDownload('download_denied', { severity: 'warning', reason: 'invalid_params' });
    return res.status(400).json({ error: 'Parametros invalidos.' });
  }
  const secret = process.env.DOWNLOAD_JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuracao de servidor invalida' });
  try {
    const payload = verifyToken(params.data.token, secret);
    if (!payload.downloadId || payload.exp <= Date.now()) {
      logDownload('download_denied', { severity: 'warning', downloadId: payload.downloadId, reason: 'expired_token' });
      return res.status(401).json({ error: 'Link expirado.' });
    }
    const tokenHash = crypto.createHash('sha256').update(params.data.token).digest('hex');
    const authorized = await prepararDownload(payload.downloadId, tokenHash);
    if (!authorized) {
      logDownload('download_denied', { severity: 'warning', downloadId: payload.downloadId, reason: 'not_authorized_or_consumed' });
      return res.status(410).json({ error: 'Link expirado ou limite de uso atingido.' });
    }
    const forensicSecret = process.env.FORENSIC_WATERMARK_SECRET;
    if (!forensicSecret) return res.status(500).json({ error: 'Configuracao de servidor invalida' });
    let original;
    try {
      original = await downloadFile(authorized.originalFileId);
    } catch (error) {
      if (!/Drive download failed \(404\)/.test(error.message)) throw error;
      logDownload('download_original_missing', {
        severity: 'critical',
        downloadId: authorized.downloadId,
        pedidoId: authorized.pedidoId,
        fotoId: authorized.fotoId,
        reason: 'original_not_found_in_drive',
      });
      return res.status(503).json({ error: 'Sua foto esta temporariamente indisponivel. O link continua valido: fale com a secretaria paroquial.' });
    }
    const { buffer, mimeType } = original;
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
        severity: 'error',
        downloadId: authorized.downloadId,
        pedidoId: authorized.pedidoId,
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
    logDownload('download_completed', {
      downloadId: authorized.downloadId,
      pedidoId: authorized.pedidoId,
      fotoId: authorized.fotoId,
    });
    return res.end(output.buffer);
  } catch (error) {
    if (/assinatura|Token/i.test(error.message)) {
      logDownload('download_denied', { severity: 'warning', reason: 'invalid_signature' });
      return res.status(401).json({ error: 'Link invalido.' });
    }
    next(error);
  }
};
