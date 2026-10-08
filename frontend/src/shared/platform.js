const MOBILE_UA = /Android|iPhone|iPod|IEMobile|Opera Mini|Mobile/i;
const TABLET_UA = /iPad|Tablet|PlayBook|Silk|Kindle/i;
const TABLET_WIDTH_MIN = 600;
const DESKTOP_WIDTH_MIN = 1024;

export function detectPlatform({ userAgent = '', width = 1024, hasTouch = false } = {}) {
  const ua = String(userAgent);
  if (TABLET_UA.test(ua)) return 'tablet';
  if (MOBILE_UA.test(ua)) return 'mobile';
  if (hasTouch && width >= TABLET_WIDTH_MIN && width < DESKTOP_WIDTH_MIN) return 'tablet';
  if (width < 768) return 'mobile';
  return 'desktop';
}

export function getPlatformSnapshot() {
  if (typeof document !== 'undefined') {
    const boot = document.documentElement.dataset.platform;
    if (boot === 'mobile' || boot === 'tablet' || boot === 'desktop') return boot;
  }
  if (typeof window === 'undefined') return 'desktop';
  return detectPlatform({
    userAgent: window.navigator.userAgent,
    width: window.innerWidth,
    hasTouch: window.matchMedia?.('(pointer: coarse)').matches || window.navigator.maxTouchPoints > 0,
  });
}

export function subscribePlatform(callback) {
  if (typeof window === 'undefined') return () => {};
  const update = () => callback(getPlatformSnapshot());
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('orientationchange', update, { passive: true });
  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
  };
}

export function isMobileExperience(platform) {
  return platform === 'mobile' || platform === 'tablet';
}
