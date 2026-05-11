import Section from '../layout/Section';
import SectionLabel from '../layout/SectionLabel';
import Panel from '../ui/Panel';
import { useTranslation } from '../../i18n/useTranslation';

export default function TheoryBlock() {
  const t = useTranslation();

  const cards = t('concepts.cards');
  const intro = t('concepts.intro');

  return (
    <Section id="concepts">
      <div className="max-w-5xl mx-auto">
        <SectionLabel text={t('concepts.sectionLabel')} />
        <h2 className="text-4xl md:text-5xl font-serif font-light text-text mb-10">
          {t('concepts.title')}
        </h2>

        <p className="text-base md:text-lg text-text-dim leading-relaxed mb-20 max-w-3xl">
          {intro}
        </p>

        {/* Physics Grid - 3 numbered cards */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-10">
          {cards.map((card, i) => (
            <Panel key={i} className="flex flex-col relative group hover:scale-105 duration-300">
              {/* Large number */}
              <div className="text-7xl md:text-8xl font-serif font-light text-gold/30 leading-none mb-6 group-hover:text-gold/50 transition-colors">
                {card.number}
              </div>

              <h3 className="text-lg md:text-xl font-serif font-semibold text-gold mb-4 relative z-10 -mt-4">
                {card.title}
              </h3>

              <p className="text-sm md:text-base text-text-dim leading-relaxed flex-grow">
                {card.description}
              </p>
            </Panel>
          ))}
        </div>
      </div>
    </Section>
  );
}
