const crypto = require('crypto');
const sharp = require('sharp');

const FINGERPRINT_VERSION = 'pascom-v1';

function createFingerprintId(secret, { pedidoId, fotoId, downloadId }) {
  if (!secret) throw new Error('Segredo forense nao configurado.');
  return crypto
    .createHmac('sha256', secret)
    .update([pedidoId, fotoId, downloadId].join('|'))
    .digest('hex')
    .slice(0, 32);
}

function hashFingerprint(fingerprintId) {
  return crypto.createHash('sha256').update(String(fingerprintId)).digest('hex');
}

function mutateChannel(value, bit) {
  if (bit) return value >= 254 ? value - 1 : value + 1;
  return value <= 1 ? value + 1 : value - 1;
}

async function applyForensicWatermark(inputBuffer, { fingerprintId, mimeType = 'image/jpeg' }) {
  if (!fingerprintId) throw new Error('FingerprintID obrigatorio.');
  const base = sharp(inputBuffer, { limitInputPixels: 80_000_000 }).rotate().ensureAlpha();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const points = Math.min(4096, Math.max(128, Math.floor((info.width * info.height) / 4500)));

  for (let index = 0; index < points; index += 1) {
    const digest = crypto
      .createHmac('sha256', fingerprintId)
      .update(`${FINGERPRINT_VERSION}:${index}`)
      .digest();
    const x = digest.readUInt32BE(0) % info.width;
    const y = digest.readUInt32BE(4) % info.height;
    const offset = (y * info.width + x) * channels;
    const bit = digest[8] & 1;
    data[offset] = mutateChannel(data[offset], bit);
    data[offset + 1] = mutateChannel(data[offset + 1], bit ^ 1);
    data[offset + 2] = mutateChannel(data[offset + 2], bit);
  }

  const image = sharp(data, { raw: { width: info.width, height: info.height, channels } })
    .withMetadata({
      exif: {
        IFD0: {
          ImageDescription: `PASCOM-FINGERPRINT:${FINGERPRINT_VERSION}:${fingerprintId}`,
          Copyright: 'Paroquia Sao Rafael - uso autorizado ao comprador',
        },
      },
    });

  if (/png/i.test(mimeType)) {
    return {
      buffer: await image.png({ compressionLevel: 9 }).toBuffer(),
      mimeType: 'image/png',
      fingerprintVersion: FINGERPRINT_VERSION,
    };
  }

  return {
    buffer: await image.flatten({ background: '#ffffff' }).jpeg({ quality: 95, mozjpeg: true }).toBuffer(),
    mimeType: 'image/jpeg',
    fingerprintVersion: FINGERPRINT_VERSION,
  };
}

module.exports = {
  FINGERPRINT_VERSION,
  createFingerprintId,
  hashFingerprint,
  applyForensicWatermark,
};
