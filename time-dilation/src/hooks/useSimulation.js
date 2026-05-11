import { useState, useEffect } from 'react';
import { lorentzFactor, C } from '../lib/physics';
import { convertVelocity } from '../lib/units';

export function useSimulation() {
  const [velocity, setVelocity] = useState(0.5); // as fraction of c
  const [duration, setDuration] = useState(10); // years
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1

  const vMs = velocity * C;
  const gamma = velocity > 0 ? lorentzFactor(vMs) : 1;

  // Times in seconds
  const durationSeconds = duration * 31536000;
  const earthTime = progress * durationSeconds;
  const shipTime = earthTime / gamma;

  const earthAge = earthTime / 31536000; // years
  const shipAge = shipTime / 31536000; // years

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return p + 0.005;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const reset = () => {
    setProgress(0);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (progress >= 1) {
      reset();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return {
    velocity,
    setVelocity,
    duration,
    setDuration,
    isPlaying,
    setIsPlaying,
    progress,
    setProgress,
    earthAge,
    shipAge,
    gamma,
    reset,
    togglePlay,
  };
}
