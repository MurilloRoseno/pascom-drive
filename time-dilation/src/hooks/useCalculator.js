import { useState } from 'react';
import { lorentzFactor, dilatedTime, properTime, velocityFromTimes, C } from '../lib/physics';
import { convertVelocity, convertTime } from '../lib/units';

export function useCalculator() {
  const [mode, setMode] = useState('dilated'); // dilated, proper, velocity, lorentz
  const [input1, setInput1] = useState('1');
  const [input2, setInput2] = useState('0.5');
  const [velocityUnit, setVelocityUnit] = useState('c');
  const [timeUnit, setTimeUnit] = useState('y');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    try {
      setError('');
      const v1 = parseFloat(input1);
      const v2 = parseFloat(input2);

      if (isNaN(v1) || isNaN(v2)) throw new Error('Valores inválidos');
      if (v1 < 0 || v2 < 0) throw new Error('Valores devem ser positivos');

      let calculationResult = null;

      if (mode === 'dilated') {
        // Δt' = Δt × γ (given Δt and v)
        const vMs = convertVelocity(v2, velocityUnit, 'ms');
        const dtMs = convertTime(v1, timeUnit, 's');
        const gamma = lorentzFactor(vMs);
        const dtPrime = dilatedTime(dtMs, vMs);
        const dtPrimeConverted = convertTime(dtPrime, 's', timeUnit);

        calculationResult = {
          gamma,
          vPercent: (vMs / C) * 100,
          result: dtPrimeConverted,
          resultLabel: `Tempo dilatado (Δt')`,
        };
      } else if (mode === 'proper') {
        // Δt = Δt' / γ (given Δt' and v)
        const vMs = convertVelocity(v2, velocityUnit, 'ms');
        const dtPrimeMs = convertTime(v1, timeUnit, 's');
        const gamma = lorentzFactor(vMs);
        const dt = properTime(dtPrimeMs, vMs);
        const dtConverted = convertTime(dt, 's', timeUnit);

        calculationResult = {
          gamma,
          vPercent: (vMs / C) * 100,
          result: dtConverted,
          resultLabel: `Tempo próprio (Δt)`,
        };
      } else if (mode === 'velocity') {
        // v = c × √(1 - (Δt/Δt')²) (given Δt and Δt')
        const dtMs = convertTime(v1, timeUnit, 's');
        const dtPrimeMs = convertTime(v2, timeUnit, 's');
        const vMs = velocityFromTimes(dtMs, dtPrimeMs);
        const gamma = lorentzFactor(vMs);
        const vConverted = convertVelocity(vMs, 'ms', velocityUnit);

        calculationResult = {
          gamma,
          vPercent: (vMs / C) * 100,
          result: vConverted,
          resultLabel: `Velocidade`,
        };
      } else if (mode === 'lorentz') {
        // γ = 1 / √(1 - v²/c²) (given v)
        const vMs = convertVelocity(v1, velocityUnit, 'ms');
        const gamma = lorentzFactor(vMs);

        calculationResult = {
          gamma,
          vPercent: (vMs / C) * 100,
          result: gamma,
          resultLabel: `Fator de Lorentz (γ)`,
        };
      }

      setResult(calculationResult);
    } catch (err) {
      setError(err.message);
      setResult(null);
    }
  };

  const reset = () => {
    setInput1('1');
    setInput2('0.5');
    setMode('dilated');
    setError('');
    setResult(null);
  };

  return {
    mode,
    setMode,
    input1,
    setInput1,
    input2,
    setInput2,
    velocityUnit,
    setVelocityUnit,
    timeUnit,
    setTimeUnit,
    error,
    result,
    calculate,
    reset,
  };
}
