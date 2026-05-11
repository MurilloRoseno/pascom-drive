const THRESHOLD = 160;
let _intervalId = null;
let _probeIntervalId = null;
let _earlyDetected = false;

export function isUnlocked() {
  try { return localStorage.getItem('pascom_dev_unlock') === '1'; } catch { return false; }
}

// Heurística #1 — diff de dimensão. Síncrono, para uso pré-mount.
export function runEarlyDetection() {
  if (isUnlocked()) return false;
  _earlyDetected =
    window.outerWidth - window.innerWidth > THRESHOLD ||
    window.outerHeight - window.innerHeight > THRESHOLD;
  return _earlyDetected;
}

// Heurística #2 — getter em console.log (detecta DevTools undocked).
function _runProbe(onDetected) {
  const probe = {};
  let triggered = false;
  Object.defineProperty(probe, 'id', { get() { triggered = true; return ''; }, configurable: true });
  console.log('%c', probe); // eslint-disable-line no-console
  setTimeout(() => { if (triggered && !isUnlocked()) onDetected(); }, 100);
}

// Heurística #3 — timing de debugger (detecta "Pause on debugger statements"), 1x na init.
function _runDebuggerTiming(onDetected) {
  const t0 = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  if (performance.now() - t0 > 100 && !isUnlocked()) onDetected();
}

// Inicia detector contínuo. onDetected()/onClosed() são chamados quando estado muda.
export function initDevToolsDetector(onDetected, onClosed) {
  if (_intervalId !== null) return; // idempotente

  let wasOpen = _earlyDetected;

  // Heurística #3 — 1x na inicialização
  _runDebuggerTiming(onDetected);

  // Heurística #2 — probe periódico a cada 2s
  _probeIntervalId = setInterval(() => {
    if (!isUnlocked()) _runProbe(onDetected);
  }, 2000);

  // Heurística #1 — interval 500ms
  _intervalId = setInterval(() => {
    if (isUnlocked()) return;
    const open =
      window.outerWidth - window.innerWidth > THRESHOLD ||
      window.outerHeight - window.innerHeight > THRESHOLD;
    if (open && !wasOpen) { wasOpen = true; onDetected(); }
    if (!open && wasOpen) { wasOpen = false; if (onClosed) onClosed(); }
  }, 500);
}

export function teardownDevToolsDetector() {
  clearInterval(_intervalId);
  clearInterval(_probeIntervalId);
  _intervalId = null;
  _probeIntervalId = null;
}

export function installUnlockCommand() {
  // Banner no console — sempre, estilo Facebook/GitHub
  // eslint-disable-next-line no-console
  console.log('%c⚠ Pare!', 'color:#6D2077;font-size:48px;font-weight:bold;');
  // eslint-disable-next-line no-console
  console.log(
    '%cReprodução das fotos é proibida (Lei 9.610/98).\nDev legítimo: pascomUnlock()',
    'color:#18150F;font-size:14px;',
  );

  window.pascomUnlock = () => {
    try { localStorage.setItem('pascom_dev_unlock', '1'); } catch { /* noop */ }
    // eslint-disable-next-line no-console
    console.log('%c✓ DevTools liberado. Atualize a página (F5).', 'color:#3C7A5A;font-size:14px;');
  };
  window.pascomLock = () => {
    try { localStorage.removeItem('pascom_dev_unlock'); } catch { /* noop */ }
    // eslint-disable-next-line no-console
    console.log('%c✓ Proteção reativada. Atualize a página.', 'color:#6D2077;font-size:14px;');
  };
}
