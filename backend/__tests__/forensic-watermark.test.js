const sharp = require('sharp');
const {
  applyForensicWatermark,
  createFingerprintId,
  hashFingerprint,
} = require('../lib/forensic-watermark');

it('gera fingerprint deterministico sem dados pessoais', () => {
  const first = createFingerprintId('secret', { pedidoId: 'PED_1', fotoId: 'F1', downloadId: 'DL1' });
  const second = createFingerprintId('secret', { pedidoId: 'PED_1', fotoId: 'F1', downloadId: 'DL1' });
  expect(first).toBe(second);
  expect(first).toHaveLength(32);
  expect(hashFingerprint(first)).toHaveLength(64);
});

it('aplica fingerprint e retorna imagem valida', async () => {
  const input = await sharp({
    create: { width: 120, height: 90, channels: 3, background: '#8866aa' },
  }).jpeg().toBuffer();

  const output = await applyForensicWatermark(input, { fingerprintId: 'abc123', mimeType: 'image/jpeg' });
  const metadata = await sharp(output.buffer).metadata();

  expect(output.mimeType).toBe('image/jpeg');
  expect(output.fingerprintVersion).toBe('pascom-v1');
  expect(metadata.width).toBe(120);
  expect(metadata.height).toBe(90);
  expect(output.buffer.equals(input)).toBe(false);
});
