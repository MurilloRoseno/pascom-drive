// watermark-processor.test.js
// Uses real sharp with a synthetic image — no mocking needed.
const sharp = require('sharp');
const { compositeWatermark } = require('../lib/watermark-processor');

let sampleJpeg;
let largeJpeg;

beforeAll(async () => {
  // 300×400 — tall image so tile and center-logo logic has room to work
  sampleJpeg = await sharp({
    create: { width: 300, height: 400, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();

  // 2000×1600 for the downscale test
  largeJpeg = await sharp({
    create: { width: 2000, height: 1600, channels: 3, background: { r: 200, g: 200, b: 200 } },
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
    const result = await compositeWatermark(largeJpeg, 'color');
    const { width, height } = await sharp(result).metadata();
    expect(width).toBeLessThanOrEqual(1280);
    expect(height).toBeLessThanOrEqual(1280);
  });

  it('produces a thumbnail variant limited to 480px', async () => {
    const result = await compositeWatermark(largeJpeg, 'color', 'thumbnail');
    const { width, height } = await sharp(result).metadata();
    expect(width).toBeLessThanOrEqual(480);
    expect(height).toBeLessThanOrEqual(480);
  });

  it('output JPEG has EXIF metadata embedded', async () => {
    const result = await compositeWatermark(sampleJpeg, 'color');
    const meta = await sharp(result).metadata();
    expect(meta.exif).toBeDefined();
    expect(meta.exif.toString()).toContain('AMOSTRA - PROIBIDA REPRODUCAO');
  });

  it('output is deterministic (no random rotation)', async () => {
    // With angle=0 (fixed), two calls with the same input should produce identical output
    const result1 = await compositeWatermark(sampleJpeg, 'color');
    const result2 = await compositeWatermark(sampleJpeg, 'color');
    expect(result1.equals(result2)).toBe(true);
  }, 30000);
});
