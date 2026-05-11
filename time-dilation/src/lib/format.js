export function formatNumber(value, decimals = 3) {
  if (!Number.isFinite(value)) return 'N/A';

  const abs = Math.abs(value);
  if (abs === 0) return '0';

  if (abs < 1e-6 || abs > 1e9) {
    return value.toExponential(decimals);
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatVelocity(v) {
  return formatNumber(v, 2);
}

export function formatTime(t) {
  if (t < 1) return formatNumber(t * 1000, 2) + ' ms';
  if (t < 60) return formatNumber(t, 2) + ' s';
  if (t < 3600) return formatNumber(t / 60, 2) + ' min';
  if (t < 86400) return formatNumber(t / 3600, 2) + ' h';
  if (t < 31536000) return formatNumber(t / 86400, 2) + ' d';
  return formatNumber(t / 31536000, 3) + ' y';
}

export function formatPercent(ratio) {
  return formatNumber(ratio * 100, 2);
}

export function formatLorentz(gamma) {
  return formatNumber(gamma, 4);
}
