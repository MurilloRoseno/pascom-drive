import { useEffect, useState } from 'react';

const DEFAULT_THRESHOLD = 160;
const DEFAULT_INTERVAL = 1000;
const OPEN_CONFIRMATIONS = 2;
const CLOSE_CONFIRMATIONS = 3;

export function hasDevtoolsLikeViewportGap(metrics, threshold = DEFAULT_THRESHOLD) {
  const widthGap = Math.max(0, Number(metrics.outerWidth || 0) - Number(metrics.innerWidth || 0));
  const heightGap = Math.max(0, Number(metrics.outerHeight || 0) - Number(metrics.innerHeight || 0));
  return widthGap > threshold || heightGap > threshold;
}

export function nextGuardCounters(counters, detected) {
  if (detected) {
    const openCount = counters.openCount + 1;
    return {
      openCount,
      closeCount: 0,
      open: openCount >= OPEN_CONFIRMATIONS ? true : counters.open,
    };
  }

  const closeCount = counters.closeCount + 1;
  return {
    openCount: 0,
    closeCount,
    open: closeCount >= CLOSE_CONFIRMATIONS ? false : counters.open,
  };
}

export function useDevtoolsGuard({
  enabled = true,
  production = import.meta.env.PROD,
  threshold = DEFAULT_THRESHOLD,
  intervalMs = DEFAULT_INTERVAL,
} = {}) {
  const [isDevtoolsOpen, setIsDevtoolsOpen] = useState(false);

  useEffect(() => {
    const canRun = Boolean(enabled && production && typeof window !== 'undefined' && typeof document !== 'undefined');
    if (!canRun) {
      document?.body?.classList.remove('devtools-open');
      setIsDevtoolsOpen(false);
      return undefined;
    }

    let counters = { openCount: 0, closeCount: 0, open: false };

    const applyState = (nextOpen) => {
      document.body.classList.toggle('devtools-open', nextOpen);
      setIsDevtoolsOpen(nextOpen);
    };

    const check = () => {
      if (document.hidden) return;
      counters = nextGuardCounters(counters, hasDevtoolsLikeViewportGap(window, threshold));
      applyState(counters.open);
    };

    check();
    const timer = window.setInterval(check, intervalMs);
    window.addEventListener('resize', check, { passive: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', check);
      document.body.classList.remove('devtools-open');
    };
  }, [enabled, production, threshold, intervalMs]);

  return { isDevtoolsOpen };
}
