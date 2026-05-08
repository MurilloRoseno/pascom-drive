// watermark-processor.test.js
// Uses real sharp with a synthetic image — no mocking needed.
const sharp = require('sharp');
const { compositeWatermark } = require('../lib/watermark-processor');

let sampleJpeg;

beforeAll(async () => {
  // 200×200 so the watermark logic has room to work (bigWidth = 80px ≥ 1)
  sampleJpeg = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
});

describe('compositeWatermark', () => {
  it('returns a non-empty Buffer', async () => {
    const result = await compositeWatermark(sampleJpeg, 'color');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('output is a valid JPEG (starts with FF D8)', async () => {
    const result = await compositeWatermark(sampleJpeg, 'color');
    expect(result[0]).toBe(0xff);
    expect(result[1]).toBe(0xd8);
  });

  it('accepts bw watermark type without throwing', async () => {
    await expect(compositeWatermark(sampleJpeg, 'bw')).resolves.toBeInstanceOf(Buffer);
  });

  it('falls back to color when unknown type given', async () => {
    await expect(compositeWatermark(sampleJpeg, 'unknown')).resolves.toBeInstanceOf(Buffer);
  });

  it('output dimensions are ≤1200px on both sides', async () => {
    // Create a large image that should be downscaled
    const largeJpeg = await sharp({
      create: { width: 2000, height: 1600, channels: 3, background: { r: 200, g: 200, b: 200 } },
    })
      .jpeg()
      .toBuffer();

    const result = await compositeWatermark(largeJpeg, 'color');
    const { width, height } = await sharp(result).metadata();
    expect(width).toBeLessThanOrEqual(1200);
    expect(height).toBeLessThanOrEqual(1200);
  });

  it('output JPEG has EXIF metadata embedded', async () => {
    const result = await compositeWatermark(sampleJpeg, 'color');
    const meta = await sharp(result).metadata();
    expect(meta.exif).toBeDefined();
    // The EXIF buffer should contain our string somewhere
    expect(meta.exif.toString()).toContain('AMOSTRA - PROIBIDA REPRODUCAO');
  });

  it('output varies between calls (random rotation)', async () => {
    // Two calls with the same input should produce different buffers due to random angle
    const result1 = await compositeWatermark(sampleJpeg, 'color');
    const result2 = await compositeWatermark(sampleJpeg, 'color');
    // They should differ (random rotation means different pixels)
    // Very rarely both might pick the same angle — run a few times to be safe
    let differ = !result1.equals(result2);
    if (!differ) {
      const result3 = await compositeWatermark(sampleJpeg, 'color');
      differ = !result1.equals(result3);
    }
    expect(differ).toBe(true);
  });
});
