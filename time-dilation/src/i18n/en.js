export default {
  nav: {
    concepts: 'Concepts',
    calculator: 'Calculator',
    simulation: 'Simulation',
    didactic: 'Deep Dive',
    faq: 'FAQ',
  },
  hero: {
    eyebrow: 'Special Relativity, Einstein 1905',
    title1: 'Time',
    title2: 'Dilation',
    subtitle: 'As velocity approaches the speed of light, time itself bends. Explore mathematically the most extraordinary effect of modern physics.',
    ctaPrimary: 'Calculate Now',
    ctaSecondary: 'Understand the Physics',
    scroll: 'Explore',
  },
  concepts: {
    sectionLabel: 'Fundamentals',
    title: 'Core Concepts',
    intro: 'Special relativity revealed that time is not absolute. It dilates or contracts depending on the relative velocity between observers.',
    cards: [
      {
        number: '01',
        title: 'Invariance of Light',
        description: 'The speed of light (c) is constant in all inertial reference frames, regardless of the motion of the source or observer.',
      },
      {
        number: '02',
        title: 'Time Dilation',
        description: 'A moving clock runs slower compared to a stationary clock, as observed by a stationary observer.',
      },
      {
        number: '03',
        title: 'Lorentz Factor',
        description: 'The parameter γ quantifies the intensity of relativistic effects. It grows dramatically as v approaches c.',
      },
    ],
  },
  calculator: {
    sectionLabel: 'Calculate',
    title: 'Dilation Calculator',
    subtitle: 'Enter velocity and time to calculate relativistic effects',
    modeLabel: 'Mode',
    modeRelative: 'Relative Velocity',
    modeGamma: 'Lorentz Factor',
    velocityLabel: 'Velocity (v)',
    speedOfLight: 'c (speed of light)',
    percentage: '% of speed of light',
    gammaLabel: 'Lorentz Factor (γ)',
    timeLabel: 'Proper Time (Δt₀)',
    year: 'year',
    years: 'years',
    resultLabel: 'Dilated Time',
    resultDescription: 'Time observed in the stationary reference frame',
    timeDilation: 'Time Dilation',
    timeDilationFormula: 'Δt = γ · Δt₀',
    gamma: 'γ (Lorentz Factor)',
    gammaFormula: 'γ = 1 / √(1 - v²/c²)',
    calculateButton: 'Calculate',
    errorVelocityInvalid: 'Velocity must be between 0 and 0.99c',
    errorTimeInvalid: 'Time must be positive',
  },
  simulation: {
    sectionLabel: 'Simulation',
    title: 'Simulation: Earth vs Ship',
    controlsLabel: 'Controls',
    velocityLabel: 'Ship Velocity',
    durationLabel: 'Journey Duration',
    lorentzLabel: 'Lorentz Factor',
    lorentzDescription: 'How much time dilates for the ship relative to Earth.',
    startButton: 'Start',
    pauseButton: 'Pause',
    timelineLabel: 'Timeline',
    earthLabel: 'EARTH',
    shipLabel: 'SPACESHIP',
    yearsLabel: 'years',
    accumulatedLabel: 'Accumulated Difference',
    accumulatedDescription: (percent) => `The astronaut aged ${percent}% less than people on Earth.`,
  },
  didactic: {
    sectionLabel: 'Deep Dive',
    title: 'Understand the Calculation',
    items: [
      {
        title: 'What is happening?',
        body: `
          The formula Δt = γ · Δt₀ describes how time dilates as observed by a stationary observer.

          Imagine an astronaut traveling at 99% the speed of light. For each year that passes on the ship, approximately 7 years pass on Earth. This is the phenomenon of time dilation.
        `,
      },
      {
        title: 'Who observes what?',
        body: `
          Δt₀ is the "proper time" (measured in the ship's frame). Δt is the "observed time" (measured on Earth).

          From the ship's perspective, Earth is moving at 99% of c, so Earth's clocks also run slowly. But because the ship is the one accelerating, the ship ages less in comparison.
        `,
      },
      {
        title: 'Why does γ grow so fast?',
        body: `
          The Lorentz factor is γ = 1 / √(1 - v²/c²). As v approaches c, the denominator approaches zero, causing γ → ∞.

          This means at 99.99% of c, time dilates enormously. No mass can reach c because that would require infinite energy.
        `,
      },
      {
        title: 'Does email travel faster than light?',
        body: `
          No. Nothing can travel faster than light, not even information. If something could, it would violate causality (effects would occur before causes in some frames).

          Special relativity preserves the causal order of events, allowing the universe to be consistent.
        `,
      },
      {
        title: 'Why did Einstein have this idea?',
        body: `
          In 1905, Maxwell's equations for electromagnetism seemed to break classical laws of motion. Einstein resolved the conflict by postulating that c is always constant, leading to relativistic effects.

          This was a revolutionary logical leap that reshaped our understanding of space and time.
        `,
      },
    ],
  },
  faq: {
    sectionLabel: 'Questions',
    title: 'Frequently Asked Questions',
    items: [
      {
        q: 'What is time dilation?',
        a: `Time dilation is the relativistic phenomenon where moving clocks run slower than stationary clocks, as observed by a stationary observer. This is a real effect, verified experimentally.`,
      },
      {
        q: 'Has it been observed in practice?',
        a: `Yes. Muons (particles created in the atmosphere) live only 2.2 microseconds in their own frame, but due to time dilation, they reach Earth's surface because they age slower in our frame. Particle accelerators confirm this daily.`,
      },
      {
        q: 'Why can\'t we travel at relativistic speeds?',
        a: `Because the energy required grows without limit as we approach c. For a 1000-ton ship to reach 99.9% of c would require more energy than humanity consumes in a year. Relativity forbids it, not current engineering limitations.`,
      },
      {
        q: 'What is the Lorentz Factor?',
        a: `The Lorentz Factor (γ) quantifies the intensity of relativistic effects. It is defined as γ = 1 / √(1 - v²/c²). At low velocities, γ ≈ 1. At high velocities, γ grows dramatically.`,
      },
      {
        q: 'What is the difference between time dilation and length contraction?',
        a: `Time dilation affects the passage of time in a moving frame. Length contraction (Lorentz-FitzGerald contraction) affects the length of moving objects. Both are predictions of special relativity and occur simultaneously.`,
      },
      {
        q: 'Is this calculator accurate?',
        a: `Yes. We use the standard relativistic formula Δt = γ · Δt₀, where γ = 1 / √(1 - v²/c²). This is exactly Einstein's special relativity formula. All calculations are verified against known physical data.`,
      },
      {
        q: 'What is the maximum possible speed?',
        a: `c (299,792,458 meters per second, approximately 300,000 km/s). Nothing with mass can reach it. Photons (light) always travel at c because they have zero mass. For any massive object, v < c always.`,
      },
    ],
  },
  footer: {
    footer_title: 'Eranildo Relativity Lab',
    tagline: 'Time Dilation Calculator, Special Relativity',
    credits: 'Based on Einstein, 1905',
    idealizer: 'Idealized by',
    developer: 'Development',
    linkedInUrl: 'https://www.linkedin.com/in/murilloroseno/',
  },
};
