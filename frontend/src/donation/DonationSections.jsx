import Icon from './icons.jsx';
import { DESTINOS, FAQ, FUNDAMENTOS, OTHER_WAYS, PARISH, STEPS } from './donation-content.js';

export function DestinosSection() {
  return (
    <section className="doar-section" aria-labelledby="doar-destinos" data-reveal>
      <h2 id="doar-destinos">Para onde vai sua oferta</h2>
      <p className="doar-lede">Você escolhe o destino no formulário. Ele fica registrado em cada doação.</p>
      <ol className="doar-destinos">
        {Object.entries(DESTINOS).map(([id, destino], index) => (
          <li key={id}>
            <span className="doar-destino-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{destino.label}</h3>
              <p>{destino.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FundamentosSection() {
  return (
    <section className="doar-section doar-fundamentos" aria-labelledby="doar-fundamentos" data-reveal>
      <picture className="doar-fundamentos-photo">
        <source srcSet="/assets/hero-igreja-sao-rafael.avif" type="image/avif" />
        <source srcSet="/assets/hero-igreja-sao-rafael.webp" type="image/webp" />
        <img src="/assets/hero-igreja-sao-rafael.png" alt="Fachada da igreja matriz da Paróquia São Rafael" loading="lazy" width="1360" height="1020" />
      </picture>
      <h2 id="doar-fundamentos">{FUNDAMENTOS.title}</h2>
      <p className="doar-lede">{FUNDAMENTOS.intro}</p>
      <dl className="doar-canons">
        {FUNDAMENTOS.items.map((item) => (
          <div key={item.ref}>
            <dt>
              <span className="doar-canon-ref">{item.ref}</span>
              {item.title}
            </dt>
            <dd>{item.text}</dd>
          </div>
        ))}
      </dl>
      <div className="doar-free">
        <h3>{FUNDAMENTOS.free.title}</h3>
        <p>{FUNDAMENTOS.free.text}</p>
      </div>
      <p className="doar-sources">
        Fontes:{' '}
        {FUNDAMENTOS.sources.map((source, index) => (
          <span key={source.href}>
            {index > 0 && ' · '}
            <a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a>
          </span>
        ))}
      </p>
    </section>
  );
}

export function StepsSection() {
  return (
    <section className="doar-section" aria-labelledby="doar-como" data-reveal>
      <h2 id="doar-como">Como funciona</h2>
      <ol className="doar-steps">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="doar-step-number" aria-hidden="true">{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OtherWaysSection() {
  return (
    <section className="doar-section" aria-labelledby="doar-outras" data-reveal>
      <h2 id="doar-outras">Outras formas de contribuir</h2>
      <ul className="doar-ways">
        {OTHER_WAYS.map((way) => (
          <li key={way.title}>
            <Icon name={way.icon} size={26} />
            <div>
              <h3>{way.title}</h3>
              <p>{way.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="doar-section" aria-labelledby="doar-faq" data-reveal>
      <h2 id="doar-faq">Perguntas frequentes</h2>
      <div className="doar-faq">
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>{item.q}<Icon name="chevron" size={20} /></summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function DonationFooter() {
  return (
    <footer className="doar-footer">
      <div className="doar-footer-inner">
        <div>
          <strong className="doar-footer-name">{PARISH.name}</strong>
          <p>{PARISH.city}, Maranhão</p>
        </div>
        <ul>
          <li><Icon name="whatsapp" size={18} /><a href={PARISH.whatsappUrl} target="_blank" rel="noopener noreferrer">{PARISH.whatsappLabel}</a></li>
          <li><Icon name="mail" size={18} /><a href={`mailto:${PARISH.email}`}>{PARISH.email}</a></li>
          <li><Icon name="clock" size={18} /><span>{PARISH.hours}</span></li>
        </ul>
        <nav aria-label="Links institucionais">
          <a href="/">Site da paróquia</a>
          <a href="/privacidade">Política de privacidade</a>
        </nav>
      </div>
      <p className="doar-footer-note">Pagamentos processados pelo Stripe. A doação é livre e não dá direito a produto ou serviço.</p>
      <div className="doar-footer-legal">
        <span>© {new Date().getFullYear()} {PARISH.name}. Todos os direitos reservados.</span>
        <span>{PARISH.city} · Maranhão · <a href="/privacidade">Privacidade</a></span>
      </div>
      <div className="doar-footer-motto" aria-hidden="true">
        <img src="/assets/footer-motto.svg" alt="" width="1834" height="196" loading="lazy" draggable="false" />
      </div>
    </footer>
  );
}
