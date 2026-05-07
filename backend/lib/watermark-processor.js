// watermark-processor.js — Composite a tiled, semi-transparent watermark over a photo.
// Architecture: build a spaced tile, then use sharp's { tile: true } to repeat it.
const sharp = require('sharp');
const path = require('path');

// --- Tunable constants ---
const TILE_WIDTH   = 1000;   // logo width in pixels; increase for larger tiles
const TILE_OPACITY = 1;  // 0 = invisible, 1 = fully opaque (0.30 = subtle)
const TILE_SPACING = 100;   // transparent gap (px) around each tile

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

// Convert dark-background PNG → transparent PNG with controlled opacity.
// Alpha = luminance × TILE_OPACITY, so black pixels vanish and bright logo pixels
// appear at TILE_OPACITY level.
async function buildWatermarkTile(watermarkPath) {
  const { data, info } = await sharp(watermarkPath)
    .resize(TILE_WIDTH, null, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
    data[i + 3] = Math.round(lum * 255 * TILE_OPACITY);
  }

  return { buffer: Buffer.from(data), width: info.width, height: info.height };
}

// Wrap tile in a transparent canvas with TILE_SPACING padding so that when
// sharp tiles it the logos are separated by visible gaps.
async function buildSpacedTile(tile) {
  const canvasW = tile.width  + TILE_SPACING;
  const canvasH = tile.height + TILE_SPACING;
  const offsetTop  = Math.round(TILE_SPACING / 2);
  const offsetLeft = Math.round(TILE_SPACING / 2);

  return sharp({
    create: { width: canvasW, height: canvasH, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: tile.buffer,
      raw:   { width: tile.width, height: tile.height, channels: 4 },
      top:  offsetTop,
      left: offsetLeft,
    }])
    .png()
    .toBuffer();
}

/**
 * Composite a tiled watermark over the given image buffer.
 * @param {Buffer} imageBuffer  JPEG or PNG input photo
 * @param {'color'|'bw'} type  Which watermark variant to use
 * @returns {Promise<Buffer>}   JPEG output at quality 85
 */
async function compositeWatermark(imageBuffer, type = 'color') {
  const watermarkPath = ASSETS[type] || ASSETS.color;

  const image = sharp(imageBuffer);
  const { width: imgW, height: imgH } = await image.metadata();

  const tile       = await buildWatermarkTile(watermarkPath);
  const spacedTile = await buildSpacedTile(tile);

  // sharp requires composite input ≤ base image dimensions
  const tileW = tile.width  + TILE_SPACING;
  const tileH = tile.height + TILE_SPACING;
  let finalTile = spacedTile;
  if (tileW > imgW || tileH > imgH) {
    const scale = Math.min(imgW / tileW, imgH / tileH);
    finalTile = await sharp(spacedTile)
      .resize(Math.max(1, Math.floor(tileW * scale)), Math.max(1, Math.floor(tileH * scale)))
      .png()
      .toBuffer();
  }

  return image
    .composite([{ input: finalTile, tile: true, blend: 'over' }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

module.exports = { compositeWatermark };
