import { useTranslation } from '../../i18n/useTranslation';
import Button from '../ui/Button';
import { BlockFormula } from '../ui/Formula';

export default function Hero() {
  const t = useTranslation();

  return (
    <section id="hero" className="min-h-screen flex flex-col items-center justify-center px-4 md:px-8 relative overflow-hidden pt-32 md:pt-20">
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-gradient-to-b from-nebula-1/40 via-transparent to-transparent blur-3xl -z-10" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="text-center max-w-4xl">
        {/* Eyebrow */}
        <div
          className="text-xs font-mono text-gold uppercase tracking-widest mb-6 md:mb-10 opacity-0"
          style={{
            animation: 'fadeUp 0.8s ease-out 0.3s forwards',
          }}
        >
          ✦ {t('hero.eyebrow')} ✦
        </div>

        {/* Title - Split */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-light italic text-text leading-tight mb-6 md:mb-10 opacity-0"
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
          className="text-base md:text-lg lg:text-xl text-text-dim leading-relaxed mb-14 md:mb-16 opacity-0 max-w-2xl mx-auto"
          style={{
            animation: 'fadeUp 0.8s ease-out 0.7s forwards',
          }}
        >
          {t('hero.subtitle')}
        </p>

        {/* Formula */}
        <div
          className="my-14 md:my-16 opacity-0"
          style={{
            animation: 'fadeUp 0.8s ease-out 0.9s forwards',
          }}
        >
          <BlockFormula math="\Delta t = \gamma \cdot \Delta t_0" />
        </div>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center opacity-0"
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
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-0"
        style={{
          animation: 'fadeUp 0.8s ease-out 1.3s forwards',
        }}
      >
        <div className="w-0.5 h-10 bg-gradient-to-b from-gold to-transparent" style={{ animation: 'scrollPulse 2s ease-in-out infinite' }} />
        <span className="text-xs font-mono text-gold uppercase tracking-widest font-semibold">{t('hero.scroll')}</span>
      </div>
    </section>
  );
}
