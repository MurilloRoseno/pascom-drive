import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { listarEventos } from '../lib/api.js';
import { demoEvents } from '../data/demoCatalog.js';

const sacraments = [
  ['batismo', 'Batismo', 'Novo nascimento na vida cristã', 'batismo.ico'],
  ['eucaristia', 'Eucaristia', 'Alimento que fortalece na vida cristã', 'eucaristia.ico'],
  ['crisma', 'Crisma', 'Fortalecidos pelo Espírito Santo', 'crisma.ico'],
  ['casamento', 'Casamento', 'Aliança de amor e fidelidade', 'casamento.ico'],
  ['uncao-dos-enfermos', 'Unção dos Enfermos', 'Consolo e força nas enfermidades', 'un__o_dos_enfermos.ico'],
  ['ordem', 'Ordem', 'Vocação para o serviço de Deus', 'ordem.ico'],
];

const activities = [
  ['20', 'MAI', 'Batizado Coletivo - Junho 2026', 'Paróquia São Rafael · 14h00'],
  ['25', 'MAI', 'Festa de Nossa Senhora Auxiliadora', 'Igreja Matriz · 19h00'],
  ['08', 'JUN', 'Missa em Ação de Graças', 'Paróquia São Rafael · 18h00'],
  ['15', 'JUN', 'Encontro de Casais com Cristo', 'Salão Paroquial · 08h00'],
];

const testimonials = [
  ['Maria Aparecida', 'Membro há 8 anos', 'A Paróquia São Rafael é onde encontro paz, comunhão e a presença de Deus todos os dias. Minha segunda casa!', '47'],
  ['João Ricardo', 'Ministro da Liturgia', 'Os eventos e celebrações são sempre muito bem organizados. Nossa fé se fortalece em cada encontro.', '12'],
  ['Ana Lúcia Santos', 'Membro do Coral', 'Lugar de acolhimento e amor. Meus filhos cresceram na fé graças ao trabalho desta linda comunidade.', '32'],
];

function Ornament({ hero = false }) {
  if (!hero) return <div className="ornamento" aria-hidden="true"><span>✛</span></div>;
  return (
    <div className="ornamento hero-ornamento" aria-hidden="true">
      <span>
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="10.25" y="2" width="3.5" height="20" rx="1.1" fill="currentColor" />
          <rect x="2" y="10.25" width="20" height="3.5" rx="1.1" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

function EventCard({ event }) {
  const date = event.date ? new Date(`${event.date}T12:00:00`) : null;
  const day = date && !Number.isNaN(date.valueOf()) ? String(date.getDate()).padStart(2, '0') : '--';
  const month = date && !Number.isNaN(date.valueOf()) ? date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase() : 'DATA';
  return (
    <article className="evento-card">
      <Link to={`/evento/${encodeURIComponent(event.eventoId)}`} className="evento-card-link" aria-label={`Abrir galeria de ${event.title}`}>
        <div className="evento-foto">
          <img src={event.cover || '/assets/previews/cover-institucional.webp'} alt={`Galeria de ${event.title}`} loading="lazy" draggable="false" />
          <div className="evento-data-badge"><span className="dia">{day}</span><span className="mes">{month}</span></div>
          {event.isDemo && <span className="demo-badge">Demonstração</span>}
        </div>
        <div className="evento-info">
          <div className="evento-titulo">{event.title}</div>
          <div className="evento-meta">
            <span>◷ {event.dateLabel || event.date} às {event.time || 'Horário a confirmar'}</span>
            <span>⌖ {event.location || 'Paróquia São Rafael'}</span>
          </div>
          <span className="evento-link">
            {event.visibility === 'protegida' ? 'Ver galeria protegida' : 'Ver fotos'} →
          </span>
        </div>
      </Link>
    </article>
  );
}

Ornament.propTypes = { hero: PropTypes.bool };
EventCard.propTypes = {
  event: PropTypes.shape({
    eventoId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string,
    dateLabel: PropTypes.string,
    time: PropTypes.string,
    location: PropTypes.string,
    cover: PropTypes.string,
    visibility: PropTypes.string,
    isDemo: PropTypes.bool,
  }).isRequired,
};

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [events, setEvents] = useState(demoEvents.slice(1));

  useEffect(() => {
    listarEventos()
      .then(({ eventos }) => setEvents(eventos.length ? eventos.slice(0, 3) : demoEvents.slice(1)))
      .catch(() => setEvents(demoEvents.slice(1)));
  }, []);

  function search(event) {
    event.preventDefault();
    navigate(`/buscar?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-texto">
          <h1 className="hero-titulo">Bem-vindo à<br /><span>Paróquia São Rafael</span></h1>
          <Ornament hero />
          <p className="hero-sub">Encontre sua melhor lembrança</p>
          <p className="hero-desc">Reviva os momentos sagrados da nossa comunidade</p>
          <form className="hero-busca" onSubmit={search}>
            <input name="q" type="text" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Busque por evento, data ou sacramento..." />
            <button type="submit" aria-label="Buscar">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
              Buscar
            </button>
          </form>
        </div>
      </section>
      <section className="sacramentos" id="sacramentos">
        <Ornament />
        <h2 className="sec-titulo">Sacramentos e Celebrações</h2>
        <div className="sacramentos-grid">
          {sacraments.map(([slug, name, description, icon]) => (
            <Link className="sac-card" to={`/buscar?categoria=${slug}`} key={slug}>
              <div className="sac-icone"><img src={`/assets/${icon}`} alt="" /></div>
              <div className="sac-nome">{name}</div>
              <div className="sac-desc">{description}</div>
              <div className="sac-linha" />
            </Link>
          ))}
        </div>
      </section>
      <section className="eventos" id="eventos">
        <Ornament />
        <h2 className="sec-titulo">Eventos Recentes</h2>
        <div className="eventos-grid">{events.map((event) => <EventCard key={event.eventoId} event={event} />)}</div>
      </section>
      <section className="missao" id="sobre">
        <div className="missao-inner">
          <div>
            <span className="missao-badge">Nossa Missão</span>
            <h2 className="missao-titulo">Sobre a Paróquia São Rafael</h2>
            <p className="missao-p">A Paróquia São Rafael está localizada em Açailândia/MA e pertence à Diocese de Imperatriz. Há décadas servindo à comunidade com amor e dedicação.</p>
            <p className="missao-p">Nossa missão é anunciar o Evangelho, celebrar os sacramentos e promover a caridade, formando cristãos comprometidos com a transformação do mundo.</p>
            <div className="stats-row">
              {[['2.000+', 'Famílias'], ['15+', 'Ministérios'], ['40+', 'Anos de História'], ['1', 'Propósito: Amar e Servir']].map(([number, label]) => (
                <div className="stat-item" key={label}><span className="stat-num">{number}</span><span className="stat-label">{label}</span></div>
              ))}
            </div>
            <a href="/#sobre" className="btn-missao">Conheça Nossa História</a>
          </div>
          <div className="missao-foto"><img src="/assets/hero-igreja-sao-rafael.png" alt="Igreja São Rafael" loading="lazy" /></div>
        </div>
      </section>
      <section className="atividades">
        <Ornament />
        <h2 className="sec-titulo">Próximas Atividades</h2>
        <div className="atividades-lista">
          {activities.map(([day, month, title, location]) => (
            <div className="ativ-item" key={title}>
              <div className="ativ-data"><span className="dia">{day}</span><span className="mes">{month}</span></div>
              <div className="ativ-texto"><div className="ativ-nome">{title}</div><div className="ativ-local">{location}</div></div>
            </div>
          ))}
        </div>
      </section>
      <section className="testemunhos">
        <Ornament />
        <h2 className="sec-titulo">O que Dizem Nossos Fiéis</h2>
        <div className="test-grid">
          {testimonials.map(([name, role, testimony, avatar]) => (
            <article className="test-card" key={name}>
              <div className="test-aspas">“</div><div className="test-estrelas">★★★★★</div>
              <p className="test-texto">{testimony}</p>
              <div className="test-autor"><img className="test-avatar" src={`https://i.pravatar.cc/100?img=${avatar}`} alt={name} loading="lazy" /><div><div className="test-nome">{name}</div><div className="test-funcao">{role}</div></div></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
