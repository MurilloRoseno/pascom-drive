// watermark-processor.js — Composite a tiled watermark over a photo.
// Architecture: build a spaced tile, then use sharp's { tile: true } to repeat it.
// Opacity philosophy (watermark-pro style): the PNG's natural alpha channel is used
// as-is — no pixel-level opacity reduction. Transparency is baked into the PNG asset.
const sharp = require('sharp');
const path = require('path');

// --- Tunable constants ---
const TILE_WIDTH   = 350;    // logo width in pixels; smaller = more tiles per photo
const TILE_SPACING = 60;     // transparent gap (px) around each tile
const ROTATION_MIN    = 15;     // minimum watermark rotation angle (degrees)
const ROTATION_MAX    = 45;     // maximum watermark rotation angle (degrees)
const CENTER_SCALE    = 0.40;   // big center watermark: fraction of image width
const JPEG_QUALITY    = 85;     // output JPEG quality (1–100)

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

// Build a watermark tile at a specific pixel width.
// Alpha channel is kept exactly as designed in the PNG — no opacity reduction.
async function buildWatermarkTileAtWidth(watermarkPath, tileWidth) {
  return sharp(watermarkPath)
    .resize(tileWidth, null, { fit: 'inside' })
    .ensureAlpha()
    .png()
    .toBuffer();
}

/**
 * Detect whether a photo is colorful or black & white by measuring average
 * HSV saturation over a downsampled version of the image.
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

// Convenience wrapper: build tile at the default TILE_WIDTH.
async function buildWatermarkTile(watermarkPath) {
  return buildWatermarkTileAtWidth(watermarkPath, TILE_WIDTH);
}

// Wrap tile in a transparent canvas with TILE_SPACING padding so that when
// sharp tiles it the logos are separated by visible gaps.
async function buildSpacedTile(tileBuffer) {
  const { width, height } = await sharp(tileBuffer).metadata();
  const canvasW = width  + TILE_SPACING;
  const canvasH = height + TILE_SPACING;
  const offsetTop  = Math.round(TILE_SPACING / 2);
  const offsetLeft = Math.round(TILE_SPACING / 2);

  return sharp({
    create: { width: canvasW, height: canvasH, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: tileBuffer,
      top:  offsetTop,
      left: offsetLeft,
    }])
    .png()
    .toBuffer();
}

/**
 * Build an SVG overlay with two diagonal white lines (X) crossing the entire image.
 * @param {number} imgW  Image width in pixels
 * @param {number} imgH  Image height in pixels
 * @returns {Buffer}     SVG buffer ready for sharp composite
 */
function buildXOverlay(imgW, imgH) {
  const svg = `<svg width="${imgW}" height="${imgH}" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="0" x2="${imgW}" y2="${imgH}" stroke="white" stroke-width="4" stroke-opacity="0.85"/>
    <line x1="${imgW}" y1="0" x2="0" y2="${imgH}" stroke="white" stroke-width="4" stroke-opacity="0.85"/>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Composite a tiled watermark over the given image buffer.
 * @param {Buffer} imageBuffer  JPEG or PNG input photo
 * @param {'color'|'bw'|'auto'} type  Which watermark variant to use
 * @returns {Promise<Buffer>}   JPEG output at quality 85
 */
async function compositeWatermark(imageBuffer, type = 'auto') {
  // 1. Resize input image to ≤1200px on the longest side
  const resizedBuffer = await sharp(imageBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  // 2. Auto-detect color vs B&W if not explicitly forced
  const resolvedType = (type === 'auto' || !ASSETS[type])
    ? await detectWatermarkType(resizedBuffer)
    : type;
  const watermarkPath = ASSETS[resolvedType];

  // 3. Get metadata from the resized image
  const { width: imgW, height: imgH } = await sharp(resizedBuffer).metadata();

  // 4. Build small tiled watermark (natural alpha, no opacity reduction)
  const tile = await buildWatermarkTile(watermarkPath);

  // 5. Build spaced tile
  const spacedTile = await buildSpacedTile(tile);

  // 6. Apply random rotation (ROTATION_MIN°–ROTATION_MAX°) — breaks AI pattern recognition
  const angle = ROTATION_MIN + Math.floor(Math.random() * (ROTATION_MAX - ROTATION_MIN + 1));
  let rotatedTile = await sharp(spacedTile)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 7. Resize tile if needed (must be ≤ image dimensions for sharp)
  const { width: rotW, height: rotH } = await sharp(rotatedTile).metadata();
  let finalTile = rotatedTile;
  if (rotW > imgW || rotH > imgH) {
    const scale = Math.min(imgW / rotW, imgH / rotH);
    finalTile = await sharp(rotatedTile)
      .resize(Math.max(1, Math.floor(rotW * scale)), Math.max(1, Math.floor(rotH * scale)))
      .png()
      .toBuffer();
  }

  // 8. Build big center watermark (CENTER_SCALE of image width, natural alpha)
  const bigWidth = Math.max(1, Math.round(imgW * CENTER_SCALE));
  const bigCenterBuffer = await buildWatermarkTileAtWidth(watermarkPath, bigWidth);

  // 9. Composite all layers: tiled watermark + center logo + X diagonal lines.
  const xOverlay = buildXOverlay(imgW, imgH);
  return sharp(resizedBuffer)
    .composite([
      { input: finalTile, tile: true, blend: 'over' },
      { input: bigCenterBuffer, gravity: 'center', blend: 'over' },
      { input: xOverlay, top: 0, left: 0, blend: 'over' },
    ])
    .withMetadata({
      exif: { IFD0: { ImageDescription: 'AMOSTRA - PROIBIDA REPRODUCAO' } },
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

module.exports = { compositeWatermark };
