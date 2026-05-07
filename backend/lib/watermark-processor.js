// watermark-processor.js — Composite a watermark PNG over a photo using screen blend.
// Screen blend: result = 1 - (1-photo) × (1-watermark)
// Black pixels (value=0) in watermark are invisible; bright pixels lighten the photo.
const sharp = require('sharp');
const path = require('path');

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

/**
 * Composite a watermark over the given image buffer.
 * @param {Buffer} imageBuffer  JPEG or PNG input photo
 * @param {'color'|'bw'} type  Which watermark variant to use
 * @returns {Promise<Buffer>}   JPEG output at quality 85
 */
async function compositeWatermark(imageBuffer, type = 'color') {
  const watermarkPath = ASSETS[type] || ASSETS.color;

  const image = sharp(imageBuffer);
  const { width, height } = await image.metadata();

  const watermarkResized = await sharp(watermarkPath)
    .resize(width, height, { fit: 'fill' })
    .toBuffer();

  return image
    .composite([{ input: watermarkResized, blend: 'screen' }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

module.exports = { compositeWatermark };
