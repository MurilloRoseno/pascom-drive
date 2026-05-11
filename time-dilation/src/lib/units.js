import { C } from './physics';

// Velocity conversions (all to m/s)
export const velocityUnits = {
  'ms': { label: 'm/s', toBase: (v) => v, fromBase: (v) => v },
  'kms': { label: 'km/s', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  'kmh': { label: 'km/h', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
  'c': { label: 'fraction of c', toBase: (v) => v * C, fromBase: (v) => v / C },
  'pc': { label: '% of c', toBase: (v) => (v / 100) * C, fromBase: (v) => (v / C) * 100 },
};

// Time conversions (all to seconds)
export const timeUnits = {
  's': { label: 'seconds', toBase: (t) => t, fromBase: (t) => t },
  'min': { label: 'minutes', toBase: (t) => t * 60, fromBase: (t) => t / 60 },
  'h': { label: 'hours', toBase: (t) => t * 3600, fromBase: (t) => t / 3600 },
  'd': { label: 'days', toBase: (t) => t * 86400, fromBase: (t) => t / 86400 },
  'y': { label: 'years', toBase: (t) => t * 31536000, fromBase: (t) => t / 31536000 },
};

export function convertVelocity(value, fromUnit, toUnit) {
  const base = velocityUnits[fromUnit].toBase(value);
  return velocityUnits[toUnit].fromBase(base);
}

export function convertTime(value, fromUnit, toUnit) {
  const base = timeUnits[fromUnit].toBase(value);
  return timeUnits[toUnit].fromBase(base);
}
