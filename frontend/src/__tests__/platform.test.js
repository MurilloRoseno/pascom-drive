import { detectPlatform, isMobileExperience } from '../shared/platform.js';

describe('platform detection', () => {
  it('detects phones from user-agent', () => {
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 iPhone Mobile', width: 390 })).toBe('mobile');
  });

  it('detects tablets from user-agent or coarse pointer width', () => {
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 iPad', width: 820 })).toBe('tablet');
    expect(detectPlatform({ userAgent: 'Mozilla/5.0', width: 820, hasTouch: true })).toBe('tablet');
  });

  it('keeps wide non-touch devices on desktop', () => {
    const platform = detectPlatform({ userAgent: 'Mozilla/5.0', width: 1366, hasTouch: false });
    expect(platform).toBe('desktop');
    expect(isMobileExperience(platform)).toBe(false);
  });
});
