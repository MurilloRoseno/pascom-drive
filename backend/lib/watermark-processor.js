// watermark-processor.js — Composite a tiled, semi-transparent watermark over a photo.
// Architecture: build a spaced tile, then use sharp's { tile: true } to repeat it.
const sharp = require('sharp');
const path = require('path');

// --- Tunable constants ---
const TILE_WIDTH   = 350;    // logo width in pixels; smaller = more tiles per photo
const TILE_OPACITY = 0.35;   // 0 = invisible, 1 = fully opaque (subtle but hard to mask)
const TILE_SPACING = 60;     // transparent gap (px) around each tile

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

// Convert dark-background PNG → transparent PNG with controlled opacity.
// Alpha = luminance × opacity, so black pixels vanish and bright logo pixels
// appear at opacity level.
async function buildWatermarkTile(watermarkPath, opacity = TILE_OPACITY) {
  const { data, info } = await sharp(watermarkPath)
    .resize(TILE_WIDTH, null, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
    data[i + 3] = Math.round(lum * 255 * opacity);
  }

  return { buffer: Buffer.from(data), width: info.width, height: info.height };
}

// Build a watermark tile at a specific pixel width (for the big center overlay).
async function buildWatermarkTileAtWidth(watermarkPath, tileWidth, opacity) {
  const { data, info } = await sharp(watermarkPath)
    .resize(tileWidth, null, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
    data[i + 3] = Math.round(lum * 255 * opacity);
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

  // 1. Resize input image to ≤1200px on the longest side
  const image = sharp(imageBuffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true });

  // 2. Get metadata from the (possibly) resized image
  const resizedBuffer = await image.png().toBuffer();
  const { width: imgW, height: imgH } = await sharp(resizedBuffer).metadata();

  // 3. Build small tiled watermark (TILE_OPACITY = 0.35)
  const tile = await buildWatermarkTile(watermarkPath, TILE_OPACITY);

  // 4. Build spaced tile
  const spacedTile = await buildSpacedTile(tile);

  // 5. Apply random rotation (15°–45°) — breaks AI pattern recognition
  const angle = 15 + Math.floor(Math.random() * 31);
  let rotatedTile = await sharp(spacedTile)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 6. Resize tile if needed (must be ≤ image dimensions for sharp)
  const { width: rotW, height: rotH } = await sharp(rotatedTile).metadata();
  let finalTile = rotatedTile;
  if (rotW > imgW || rotH > imgH) {
    const scale = Math.min(imgW / rotW, imgH / rotH);
    finalTile = await sharp(rotatedTile)
      .resize(Math.max(1, Math.floor(rotW * scale)), Math.max(1, Math.floor(rotH * scale)))
      .png()
      .toBuffer();
  }

  // 7. Build big center watermark (40% of image width, opacity 0.15)
  const bigWidth = Math.max(1, Math.round(imgW * 0.4));
  const bigTile = await buildWatermarkTileAtWidth(watermarkPath, bigWidth, 0.15);
  const bigCenterBuffer = await sharp({
    create: { width: bigTile.width, height: bigTile.height, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: bigTile.buffer,
      raw:   { width: bigTile.width, height: bigTile.height, channels: 4 },
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();

  // 8 & 9. Composite both layers + EXIF + JPEG output
  return sharp(resizedBuffer)
    .composite([
      { input: finalTile, tile: true, blend: 'over' },
      { input: bigCenterBuffer, gravity: 'center', blend: 'over' },
    ])
    .withMetadata({
      exif: { IFD0: { ImageDescription: 'AMOSTRA - PROIBIDA REPRODUCAO' } },
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

module.exports = { compositeWatermark };
