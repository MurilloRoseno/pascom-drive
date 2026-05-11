import { useTranslation } from '../../i18n/useTranslation';
import Button from '../ui/Button';
import { BlockFormula } from '../ui/Formula';

export default function Hero() {
  const t = useTranslation();

  return (
    <section id="hero" className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden pt-20">
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-gradient-to-b from-nebula-1/30 via-transparent to-transparent blur-3xl -z-10" />

      <div className="text-center max-w-3xl">
        {/* Eyebrow */}
        <div
          className="text-xs font-mono text-gold uppercase tracking-widest mb-8 opacity-0"
          style={{
            animation: 'fadeUp 0.8s ease-out 0.3s forwards',
          }}
        >
          <span className="text-gold/50">&mdash;</span>
          {' '}
          {t('hero.eyebrow')}
          {' '}
          <span className="text-gold/50">&mdash;</span>
        </div>

        {/* Title - Split */}
        <h1
          className="text-6xl md:text-7xl lg:text-8xl font-serif font-light italic text-text leading-tight mb-8 opacity-0"
          style={{
            animation: 'fadeUp 0.8s ease-out 0.5s forwards',
          }}
        >
          {t('hero.title1')}
          <br />
          <span className="text-gold">{t('hero.title2')}</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base md:text-lg text-text-dim leading-relaxed mb-12 opacity-0"
          style={{
            animation: 'fadeUp 0.8s ease-out 0.7s forwards',
          }}
        >
          {t('hero.subtitle')}
        </p>

        {/* Formula */}
        <div
          className="my-12 opacity-0"
          style={{
            animation: 'fadeUp 0.8s ease-out 0.9s forwards',
          }}
        >
          <BlockFormula math="\Delta t = \gamma \cdot \Delta t_0" />
        </div>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center opacity-0"
          style={{
            animation: 'fadeUp 0.8s ease-out 1.1s forwards',
          }}
        >
          <Button
            size="lg"
            variant="primary"
            onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('hero.ctaPrimary')}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => document.getElementById('concepts')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('hero.ctaSecondary')}
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-0"
        style={{
          animation: 'fadeUp 0.8s ease-out 1.3s forwards',
        }}
      >
        <div className="w-px h-8 bg-gradient-to-b from-gold to-transparent" style={{ animation: 'scrollPulse 2s ease-in-out infinite' }} />
        <span className="text-xs font-mono text-gold uppercase tracking-widest">{t('hero.scroll')}</span>
      </div>
    </section>
  );
}
