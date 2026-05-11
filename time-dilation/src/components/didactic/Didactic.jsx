import Section from '../layout/Section';
import SectionLabel from '../layout/SectionLabel';
import Accordion from '../ui/Accordion';
import { useTranslation } from '../../i18n/useTranslation';

export default function Didactic() {
  const t = useTranslation();

  const items = t('didactic.items').map((item, i) => ({
    id: `didactic-${i}`,
    title: item.title,
    body: item.body,
  }));

  return (
    <Section id="didactic">
      <div className="max-w-4xl mx-auto">
        <SectionLabel text={t('didactic.sectionLabel')} />
        <h2 className="text-4xl md:text-5xl font-serif font-light text-text mb-16">
          {t('didactic.title')}
        </h2>
        <Accordion items={items} />
      </div>
    </Section>
  );
}
