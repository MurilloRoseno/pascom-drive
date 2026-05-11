// Speed of light in m/s
export const C = 299_792_458;

// Calculate Lorentz factor γ
export function lorentzFactor(v) {
  if (v >= C) throw new Error('Velocity must be less than c');
  if (v < 0) throw new Error('Velocity must be non-negative');
  if (!Number.isFinite(v)) throw new Error('Velocity must be finite');

  const beta = v / C;
  return 1 / Math.sqrt(1 - beta * beta);
}

// Calculate dilated time: Δt' = Δt × γ
export function dilatedTime(properTime, v) {
  if (!Number.isFinite(properTime)) throw new Error('Time must be finite');
  if (properTime < 0) throw new Error('Time must be non-negative');

  const gamma = lorentzFactor(v);
  return properTime * gamma;
}

// Calculate proper time: Δt = Δt' / γ
export function properTime(dilatedTime, v) {
  if (!Number.isFinite(dilatedTime)) throw new Error('Time must be finite');
  if (dilatedTime < 0) throw new Error('Time must be non-negative');

  const gamma = lorentzFactor(v);
  return dilatedTime / gamma;
}

// Calculate velocity from time relationship: v = c × √(1 - (Δt/Δt')²)
export function velocityFromTimes(properTime, dilatedTime) {
  if (!Number.isFinite(properTime) || !Number.isFinite(dilatedTime)) {
    throw new Error('Times must be finite');
  }
  if (properTime < 0 || dilatedTime < 0) {
    throw new Error('Times must be non-negative');
  }
  if (properTime === 0) throw new Error('Proper time cannot be zero');
  if (dilatedTime < properTime) {
    throw new Error('Dilated time cannot be less than proper time');
  }

  const ratio = properTime / dilatedTime;
  return C * Math.sqrt(1 - ratio * ratio);
}
