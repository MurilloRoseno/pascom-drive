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
      <div className="max-w-3xl mx-auto">
        <SectionLabel text={t('concepts.sectionLabel')} />
        <h2 className="text-4xl md:text-5xl font-serif font-light text-text mb-8">
          {t('concepts.title')}
        </h2>

        <p className="text-base md:text-lg text-text-dim leading-relaxed mb-16">
          {intro}
        </p>

        {/* Physics Grid - 3 numbered cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <Panel key={i} className="flex flex-col relative">
              {/* Large number */}
              <div className="text-6xl md:text-7xl font-serif font-light text-gold/20 leading-none mb-4">
                {card.number}
              </div>

              <h3 className="text-lg font-serif font-semibold text-text mb-3 relative z-10 -mt-6">
                {card.title}
              </h3>

              <p className="text-sm md:text-base text-text-dim leading-relaxed">
                {card.description}
              </p>
            </Panel>
          ))}
        </div>
      </div>
    </Section>
  );
}
