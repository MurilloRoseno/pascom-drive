import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DonationForm from './DonationForm.jsx';
import DonationHeader from './DonationHeader.jsx';
import {
  DestinosSection, DonationFooter, FaqSection, FundamentosSection, OtherWaysSection, StepsSection,
} from './DonationSections.jsx';
import Icon from './icons.jsx';
import { FALLBACK_CONFIG, HERO } from './donation-content.js';
import { brl } from './donation-math.js';
import { doacaoConfig } from '../lib/api.js';

const TRUST_ICONS = ['lock', 'mail', 'compass'];

// No celular o versiculo sai da abertura (para o formulario aparecer antes)
// e vai para o conteudo; display:none evita leitura duplicada.
function Verse({ placement }) {
  return (
    <figure className={`doar-verse is-${placement}`}>
      <blockquote>{HERO.verse}</blockquote>
      <figcaption>{HERO.verseRef}</figcaption>
    </figure>
  );
}

Verse.propTypes = { placement: PropTypes.oneOf(['hero', 'content']).isRequired };

// Revela as secoes ao entrar na tela. Sem IntersectionObserver ou com
// movimento reduzido, nada e escondido.
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!root || reduced || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    root.querySelectorAll('[data-reveal]').forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.classList.add('is-armed');
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [rootRef]);
}

export default function DonationPage() {
  const rootRef = useRef(null);
  const asideRef = useRef(null);
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [summary, setSummary] = useState({ total: 0, valid: true, monthly: false });
  const [formVisible, setFormVisible] = useState(true);
  const canceled = new URLSearchParams(window.location.search).get('cancelada') === '1';

  useReveal(rootRef);

  useEffect(() => {
    let alive = true;
    doacaoConfig()
      .then((loaded) => { if (alive && loaded && Array.isArray(loaded.destinos)) setConfig(loaded); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const aside = asideRef.current;
    if (!aside || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(aside);
    // Altura do cartao para o CSS decidir como fixa-lo quando e maior que a tela.
    const measure = () => aside.style.setProperty('--aside-h', `${aside.offsetHeight}px`);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (resize) resize.observe(aside);
    // Abrir "Quero me identificar" ou marcar opcoes muda a altura na hora.
    const measureSoon = () => setTimeout(measure, 0);
    aside.addEventListener('toggle', measure, true);
    aside.addEventListener('change', measureSoon);
    measure();
    return () => {
      observer.disconnect();
      if (resize) resize.disconnect();
      aside.removeEventListener('toggle', measure, true);
      aside.removeEventListener('change', measureSoon);
    };
  }, []);

  const goToForm = useCallback(() => {
    const aside = asideRef.current;
    if (!aside) return;
    aside.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const first = aside.querySelector('input');
    if (first) first.focus({ preventScroll: true });
  }, []);

  return (
    <div className="doar" ref={rootRef}>
      <a className="doar-skip" href="#doar-form">Ir para o formulário de doação</a>
      <section className="doar-hero">
        <picture className="doar-hero-photo" aria-hidden="true">
          <source srcSet="/assets/hero-igreja-sao-rafael.avif" type="image/avif" />
          <source srcSet="/assets/hero-igreja-sao-rafael.webp" type="image/webp" />
          <img src="/assets/hero-igreja-sao-rafael.png" alt="" width="1360" height="1020" />
        </picture>
        <DonationHeader />
        <div className="doar-hero-inner">
          <div className="doar-hero-text">
            <p className="doar-kicker">{HERO.kicker}</p>
            <h1>{HERO.title}</h1>
            <p className="doar-hero-lead">{HERO.lead}</p>
            <Verse placement="hero" />
          </div>
        </div>
      </section>

      <main className="doar-layout">
        <aside className="doar-aside" ref={asideRef} aria-label="Formulário de doação">
          <DonationForm config={config} canceled={canceled} onSummaryChange={setSummary} />
        </aside>
        <div className="doar-content">
          <ul className="doar-trust">
            {HERO.trust.map((item, index) => (
              <li key={item}><Icon name={TRUST_ICONS[index]} size={20} />{item}</li>
            ))}
          </ul>
          <Verse placement="content" />
          <DestinosSection />
          <FundamentosSection />
          <StepsSection />
          <OtherWaysSection />
          <FaqSection />
        </div>
      </main>

      <DonationFooter />

      <div className={`doar-bar${formVisible ? '' : ' is-visible'}`} aria-hidden={formVisible ? 'true' : undefined}>
        <button type="button" className="doar-cta" onClick={goToForm} tabIndex={formVisible ? -1 : 0}>
          <span>{summary.valid && summary.total > 0 ? `Doar ${brl(summary.total)}${summary.monthly ? ' por mês' : ''}` : 'Fazer minha oferta'}</span>
          <span className="doar-cta-icon"><Icon name="arrow" size={18} /></span>
        </button>
      </div>
    </div>
  );
}
