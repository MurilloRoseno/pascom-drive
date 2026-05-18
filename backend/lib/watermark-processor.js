// watermark-processor.js — Composite a tiled watermark over a photo.
// Opacity: PNG alpha is thresholded — any visible pixel becomes fully opaque (alpha=255).
// Coverage: grid is built first (imgW×imgH), then rotated and cropped back to exact size.
const sharp = require('sharp');
const path = require('path');

// --- Tunable constants ---
const TILE_WIDTH   = 300;    // logo width in pixels
const TILE_SPACING = 40;     // transparent gap (px) around each tile
const ROTATION_MIN = 15;     // minimum rotation angle (degrees)
const ROTATION_MAX = 45;     // maximum rotation angle (degrees)
const CENTER_SCALE = 0.40;   // big center watermark: fraction of image width
const JPEG_QUALITY = 85;     // output JPEG quality (1–100)

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

/**
 * Build a watermark tile at a specific pixel width.
 * Alpha threshold: any pixel with alpha > 0 becomes fully opaque (255).
 * This makes the logo fully solid regardless of anti-aliasing in the PNG.
 */
async function buildWatermarkTileAtWidth(watermarkPath, tileWidth) {
  const { data, info } = await sharp(watermarkPath)
    .resize(tileWidth, null, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Threshold: any visible pixel → fully opaque
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) data[i] = 255;
  }

  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

/**
 * Detect whether a photo is colorful or B&W by measuring average HSV saturation.
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

// Convenience wrapper at default TILE_WIDTH.
async function buildWatermarkTile(watermarkPath) {
  return buildWatermarkTileAtWidth(watermarkPath, TILE_WIDTH);
}

// Wrap tile in a transparent canvas with TILE_SPACING padding.
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
    .composite([{ input: tileBuffer, top: offsetTop, left: offsetLeft }])
    .png()
    .toBuffer();
}

/**
 * Build a full imgW×imgH canvas tiled with spacedTileBuffer (grid layout).
 * Tiles the whole canvas first, then we rotate the whole layer.
 * This guarantees 100% coverage after rotation + crop.
 */
async function buildTiledLayer(spacedTileBuffer, imgW, imgH) {
  const { width: tw, height: th } = await sharp(spacedTileBuffer).metadata();
  // Canvas is slightly larger so tiles at right/bottom edges are fully inside bounds.
  // We'll crop back to imgW×imgH after compositing.
  const cols = Math.ceil(imgW / tw) + 1;
  const rows = Math.ceil(imgH / th) + 1;
  const canvasW = cols * tw;
  const canvasH = rows * th;

  const composites = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      composites.push({ input: spacedTileBuffer, top: r * th, left: c * tw });
    }
  }

  const fullCanvas = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();

  // Crop to exact image dimensions
  return sharp(fullCanvas)
    .extract({ left: 0, top: 0, width: imgW, height: imgH })
    .png()
    .toBuffer();
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
 * Composite a tiled watermark over the given image buffer.
 * @param {Buffer} imageBuffer  JPEG or PNG input photo
 * @param {'color'|'bw'|'auto'} type  Which watermark variant to use
 * @returns {Promise<Buffer>}   JPEG output
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

  // 4. Build tile (alpha-thresholded → fully opaque logo)
  const tile = await buildWatermarkTile(watermarkPath);

  // 5. Add spacing around tile
  const spacedTile = await buildSpacedTile(tile);

  // 6. Fill full imgW×imgH canvas with tile grid
  const tiledLayer = await buildTiledLayer(spacedTile, imgW, imgH);

  // 7. Rotate the whole filled layer (random angle)
  const angle = ROTATION_MIN + Math.floor(Math.random() * (ROTATION_MAX - ROTATION_MIN + 1));
  const rotatedLayer = await sharp(tiledLayer)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 8. Crop back to exact imgW×imgH (rotate expands bounding box)
  const { width: rW, height: rH } = await sharp(rotatedLayer).metadata();
  const cropLeft = Math.max(0, Math.floor((rW - imgW) / 2));
  const cropTop  = Math.max(0, Math.floor((rH - imgH) / 2));
  const finalTiledLayer = await sharp(rotatedLayer)
    .extract({ left: cropLeft, top: cropTop, width: imgW, height: imgH })
    .png()
    .toBuffer();

  // 9. Center logo (alpha-thresholded)
  const bigWidth = Math.max(1, Math.round(imgW * CENTER_SCALE));
  const bigCenterBuffer = await buildWatermarkTileAtWidth(watermarkPath, bigWidth);

  // 10. X diagonal overlay
  const xOverlay = buildXOverlay(imgW, imgH);

  // 11. Composite all layers
  return sharp(resizedBuffer)
    .composite([
      { input: finalTiledLayer, top: 0, left: 0, blend: 'over' },
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
