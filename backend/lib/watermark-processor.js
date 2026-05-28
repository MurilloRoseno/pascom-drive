// watermark-processor.js — Composite a single full-image watermark logo over a photo.
//
// Design principles (watermark-pro style):
//  - ONE logo centered, scaled to cover the entire image (fit:cover)
//  - PNG natural alpha used as-is (no opacity modification)
//  - Plus two diagonal white X lines
//  - JPEG quality=100 + mozjpeg for max quality with smaller file size
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');

// --- Output quality ---
const VARIANTS = {
  preview: { size: 1280, quality: 84 },
  thumbnail: { size: 480, quality: 76 },
};

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

/**
 * Detect whether a photo is colorful or B&W by measuring average HSV saturation.
 * @param {Buffer} resizedBuffer  PNG buffer (already resized)
 * @returns {Promise<'color'|'bw'>}
 */
async function detectWatermarkType(resizedBuffer) {
  const { data } = await sharp(resizedBuffer)
    .resize(100, 100, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let totalSat = 0, count = 0;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b);
    totalSat += max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    count++;
  }
  return (totalSat / count) > 0.15 ? 'color' : 'bw';
}

function deterministicOffset(seed, modulo, salt) {
  const digest = crypto.createHash('sha256').update(`${seed || 'pascom'}:${salt}`).digest();
  return digest.readUInt32BE(0) % modulo;
}

function structuralOverlay(width, height, seed) {
  const spacing = Math.max(120, Math.round(Math.min(width, height) / 3));
  const offsetX = deterministicOffset(seed, spacing, 'x');
  const offsetY = deterministicOffset(seed, spacing, 'y');
  const fontSize = Math.max(22, Math.round(Math.min(width, height) / 16));
  const lines = [];
  for (let x = -spacing + offsetX; x < width + spacing; x += spacing) {
    lines.push(`<line x1="${x}" y1="0" x2="${x + height}" y2="${height}" />`);
  }
  for (let y = -spacing + offsetY; y < height + spacing; y += spacing) {
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y + width}" />`);
  }
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <g stroke="rgba(255,255,255,0.30)" stroke-width="${Math.max(1, Math.round(width / 420))}" stroke-linecap="round">
        ${lines.join('')}
      </g>
      <g transform="translate(${width / 2} ${height / 2}) rotate(-24)">
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800"
          fill="rgba(255,255,255,0.34)" stroke="rgba(70,37,95,0.28)" stroke-width="${Math.max(1, Math.round(fontSize / 18))}">
          AMOSTRA
        </text>
      </g>
    </svg>
  `);
}

/**
 * Composite a tiled watermark + center logo over the given image buffer.
 * @param {Buffer} imageBuffer         JPEG or PNG input photo
 * @param {'color'|'bw'|'auto'} type  Which watermark variant to use
 * @returns {Promise<Buffer>}          JPEG output (quality=100, mozjpeg compressed)
 */
async function compositeWatermark(imageBuffer, type = 'auto', variant = 'preview', options = {}) {
  const output = VARIANTS[variant] || VARIANTS.preview;
  // 1. Resize input to ≤1200px on longest side
  const resizedBuffer = await sharp(imageBuffer)
    .resize(output.size, output.size, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  // 2. Auto-detect color vs B&W
  const resolvedType = (type === 'auto' || !ASSETS[type])
    ? await detectWatermarkType(resizedBuffer)
    : type;
  const watermarkPath = ASSETS[resolvedType];

  // 3. Image dimensions
  const { width: imgW, height: imgH } = await sharp(resizedBuffer).metadata();

  // 4. Center logo — resize to exactly imgW×imgH covering the full image
  //    fit:'cover' scales+crops to fill both dimensions exactly.
  //    Natural PNG alpha is preserved as-is (no opacity modification).
  const centerBuffer = await sharp(watermarkPath)
    .resize(imgW, imgH, { fit: 'cover' })
    .ensureAlpha()
    .png()
    .toBuffer();

  // 5. Composite: full-image center logo only (no X lines, no tile repetition)
  return sharp(resizedBuffer)
    .composite([
      { input: centerBuffer, gravity: 'center', blend: 'over' },
      { input: structuralOverlay(imgW, imgH, options.seed), gravity: 'center', blend: 'over' },
    ])
    .withMetadata({
      exif: {
        IFD0: {
          ImageDescription: `AMOSTRA - PROIBIDA REPRODUCAO - ${options.seed || 'PASCOM'}`,
          Copyright: 'Paroquia Sao Rafael - previa protegida',
        },
      },
    })
    .jpeg({ quality: output.quality, mozjpeg: true })
    .toBuffer();
}

module.exports = { compositeWatermark, VARIANTS };
