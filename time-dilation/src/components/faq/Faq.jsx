import Section from '../layout/Section';
import SectionLabel from '../layout/SectionLabel';
import Accordion from '../ui/Accordion';
import { useTranslation } from '../../i18n/useTranslation';

export default function Faq() {
  const t = useTranslation();

  const items = t('faq.items').map((item, i) => ({
    id: `faq-${i}`,
    title: item.q,
    body: item.a,
  }));

  return (
    <Section id="faq">
      <div className="max-w-4xl mx-auto">
        <SectionLabel text={t('faq.sectionLabel')} />
        <h2 className="text-4xl md:text-5xl font-serif font-light text-text mb-16">
          {t('faq.title')}
        </h2>
        <Accordion items={items} />
      </div>
    </Section>
  );
}
