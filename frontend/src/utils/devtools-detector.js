// devtools-detector.js — blurs gallery photos when DevTools is detected open.
// Heuristic: DevTools causes a significant diff between outer and inner window dimensions.
const THRESHOLD = 200; // px difference that likely indicates DevTools panel
let _intervalId = null;

export function initDevToolsDetector() {
  if (_intervalId !== null) return; // idempotent — prevents stacking intervals on hot reload
  _intervalId = setInterval(() => {
    const devToolsOpen =
      window.outerWidth - window.innerWidth > THRESHOLD ||
      window.outerHeight - window.innerHeight > THRESHOLD;
    document.body.classList.toggle('devtools-open', devToolsOpen);
  }, 1000);
}

export function teardownDevToolsDetector() {
  clearInterval(_intervalId);
  _intervalId = null;
}
