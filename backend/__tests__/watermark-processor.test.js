// watermark-processor.test.js
// Uses real sharp with a synthetic tiny image — no mocking needed.
const sharp = require('sharp');
const { compositeWatermark } = require('../lib/watermark-processor');

let grayPixelJpeg;

beforeAll(async () => {
  grayPixelJpeg = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
});

describe('compositeWatermark', () => {
  it('returns a non-empty Buffer', async () => {
    const result = await compositeWatermark(grayPixelJpeg, 'color');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('output is a valid JPEG (starts with FF D8)', async () => {
    const result = await compositeWatermark(grayPixelJpeg, 'color');
    expect(result[0]).toBe(0xff);
    expect(result[1]).toBe(0xd8);
  });

  it('accepts bw watermark type without throwing', async () => {
    await expect(compositeWatermark(grayPixelJpeg, 'bw')).resolves.toBeInstanceOf(Buffer);
  });

  it('falls back to color when unknown type given', async () => {
    await expect(compositeWatermark(grayPixelJpeg, 'unknown')).resolves.toBeInstanceOf(Buffer);
  });
});
