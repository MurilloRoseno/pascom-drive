// watermark-processor.js — Composite a tiled watermark + center logo over a photo.
//
// Design principles (watermark-pro style):
//  - PNG natural alpha is used as-is (no opacity multiplication, no threshold)
//  - Tile size adapts to image width (~3 columns)
//  - No rotation, no gap between tiles
//  - Center logo scaled to cover the entire image
//  - JPEG quality=100 + mozjpeg for max quality with smaller file size
const sharp = require('sharp');
const path = require('path');

// --- Output quality ---
const JPEG_QUALITY = 100; // max quality; mozjpeg handles file-size compression

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

/**
 * Build a watermark tile resized to tileWidth.
 * Uses PNG's natural alpha channel — no opacity modification.
 */
async function buildWatermarkTileAtWidth(watermarkPath, tileWidth) {
  return sharp(watermarkPath)
    .resize(tileWidth, null, { fit: 'inside' })
    .ensureAlpha()
    .png()
    .toBuffer();
}

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

/**
 * Build an SVG overlay with two diagonal white lines (X) crossing the entire image.
 */
function buildXOverlay(imgW, imgH) {
  const svg = `<svg width="${imgW}" height="${imgH}" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="0" x2="${imgW}" y2="${imgH}" stroke="white" stroke-width="4" stroke-opacity="0.85"/>
    <line x1="${imgW}" y1="0" x2="0" y2="${imgH}" stroke="white" stroke-width="4" stroke-opacity="0.85"/>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Composite a tiled watermark + center logo over the given image buffer.
 * @param {Buffer} imageBuffer         JPEG or PNG input photo
 * @param {'color'|'bw'|'auto'} type  Which watermark variant to use
 * @returns {Promise<Buffer>}          JPEG output (quality=100, mozjpeg compressed)
 */
async function compositeWatermark(imageBuffer, type = 'auto') {
  // 1. Resize input to ≤1200px on longest side
  const resizedBuffer = await sharp(imageBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  // 2. Auto-detect color vs B&W
  const resolvedType = (type === 'auto' || !ASSETS[type])
    ? await detectWatermarkType(resizedBuffer)
    : type;
  const watermarkPath = ASSETS[resolvedType];

  // 3. Image dimensions
  const { width: imgW, height: imgH } = await sharp(resizedBuffer).metadata();

  // 4. Build tile — width adapts to image (~3 columns)
  const tileWidth = Math.round(imgW / 3);
  const tileBuffer = await buildWatermarkTileAtWidth(watermarkPath, tileWidth);

  // 5. Build center logo — resize to exactly imgW×imgH (fit:'cover' fills both dimensions)
  //    sharp composite requires input ≤ base image dimensions, so we use exact match.
  const bigCenterBuffer = await sharp(watermarkPath)
    .resize(imgW, imgH, { fit: 'cover' })
    .ensureAlpha()
    .png()
    .toBuffer();

  // 6. X diagonal overlay
  const xOverlay = buildXOverlay(imgW, imgH);

  // 7. Composite: tiled watermark + center logo + X lines
  //    sharp { tile: true } repeats tileBuffer to cover the full image with no rotation needed.
  return sharp(resizedBuffer)
    .composite([
      { input: tileBuffer, tile: true, blend: 'over' },
      { input: bigCenterBuffer, gravity: 'center', blend: 'over' },
      { input: xOverlay, top: 0, left: 0, blend: 'over' },
    ])
    .withMetadata({
      exif: { IFD0: { ImageDescription: 'AMOSTRA - PROIBIDA REPRODUCAO' } },
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

module.exports = { compositeWatermark };
