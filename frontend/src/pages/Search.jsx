import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { listarEventos } from '../lib/api.js';
import { categories, categoryLabel, filterDemoEvents } from '../data/demoCatalog.js';

function monthLabel(key) {
  return { 'maio-2026': 'Maio de 2026', 'junho-2026': 'Junho de 2026' }[key] || key;
}

function filterRealEvents(events, data) {
  if (!data) return events;
  return events.filter((event) => event.monthKey === data || String(event.date || '').startsWith(data === 'maio-2026' ? '2026-05' : '2026-06'));
}

function SearchCard({ event }) {
  return (
    <article className="event-card">
      <div className="event-cover">
        <img src={event.cover || '/assets/previews/cover-institucional.webp'} alt={`Galeria de ${event.title}`} loading="lazy" draggable="false" />
        <span className="event-tag">{categoryLabel(event.category)}</span>
        <span className={event.visibility === 'publica' ? 'event-open' : 'event-lock'}>{event.visibility === 'publica' ? 'Galeria pública' : 'Galeria protegida'}</span>
      </div>
      <div className="event-body">
        <h3>{event.title}</h3>
        <ul className="event-meta"><li>{event.dateLabel || event.date || 'Data a confirmar'}</li><li>{event.location || 'Paróquia São Rafael'}</li></ul>
        {event.isDemo && <p className="card-demo">Demonstração visual · compra indisponível</p>}
        {!event.isDemo && event.salesAuthorized && <p className="card-sale">Fotos disponíveis para compra</p>}
        <Link className="event-link" to={`/evento/${encodeURIComponent(event.eventoId)}`}>Ver fotos →</Link>
      </div>
    </article>
  );
}

SearchCard.propTypes = {
  event: PropTypes.shape({
    eventoId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    category: PropTypes.string,
    date: PropTypes.string,
    dateLabel: PropTypes.string,
    location: PropTypes.string,
    cover: PropTypes.string,
    visibility: PropTypes.string,
    isDemo: PropTypes.bool,
    salesAuthorized: PropTypes.bool,
  }).isRequired,
};

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({
    q: params.get('q') || '',
    categoria: params.get('categoria') || '',
    data: params.get('data') || '',
  });
  const [events, setEvents] = useState([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const query = params.get('q') || '';
  const category = params.get('categoria') || '';
  const date = params.get('data') || '';

  useEffect(() => {
    setForm({ q: query, categoria: category, data: date });
    setLoading(true);
    listarEventos({ q: query, categoria: category })
      .then(({ eventos }) => {
        if (eventos.length) {
          setEvents(filterRealEvents(eventos, date));
          setDemo(false);
        } else {
          setEvents(filterDemoEvents({ q: query, categoria: category, data: date }));
          setDemo(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setEvents(filterDemoEvents({ q: query, categoria: category, data: date }));
        setDemo(true);
        setLoading(false);
      });
  }, [query, category, date]);

  const filters = useMemo(() => [
    query && `Busca: ${query}`,
    category && categoryLabel(category),
    date && monthLabel(date),
  ].filter(Boolean), [query, category, date]);

  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => {
      if (value.trim()) next.set(key, value.trim());
    });
    setParams(next);
  }

  return (
    <main className="catalog-page">
      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link to="/">Início</Link><span aria-hidden="true">/</span><span>Buscar eventos</span></div>
          <p className="eyebrow">Galerias da comunidade</p>
          <h1 className="page-title">Encontre os momentos vividos em nossa paróquia</h1>
          <p className="page-summary">Pesquise por celebração, sacramento, data ou local e encontre galerias públicas ou protegidas, preparadas para compra.</p>
        </div>
      </section>
      <div className="search-panel">
        <form className="search-form" onSubmit={submit}>
          <label className="field" aria-label="Buscar evento">
            <input name="q" type="search" value={form.q} onChange={(event) => setForm({ ...form, q: event.target.value })} placeholder="Evento, data, local ou sacramento..." />
          </label>
          <label className="field">
            <select name="categoria" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} aria-label="Filtrar por categoria">
              <option value="">Todas as categorias</option>
              {categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="field">
            <select name="data" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} aria-label="Filtrar por data">
              <option value="">Qualquer data</option>
              <option value="maio-2026">Maio de 2026</option>
              <option value="junho-2026">Junho de 2026</option>
            </select>
          </label>
          <button className="btn-primary" type="submit">Buscar</button>
        </form>
      </div>
      <section className="main-content" aria-live="polite">
        {filters.length > 0 && <div className="chips">{filters.map((filter) => <span className="chip" key={filter}>{filter}</span>)}</div>}
        <div className="section-toolbar">
          <div>
            <h2>{category ? categoryLabel(category) : 'Eventos em destaque'}</h2>
            {!loading && <p className="result-count">{events.length} evento{events.length === 1 ? '' : 's'} encontrado{events.length === 1 ? '' : 's'}{demo ? ' · catálogo demonstrativo' : ''}</p>}
          </div>
          <Link className="clear-link" to="/buscar">Limpar filtros</Link>
        </div>
        {demo && <div className="demo-notice">Esta é uma demonstração visual enquanto não há eventos reais publicados. As fotos exibidas não estão disponíveis para compra.</div>}
        {loading && <div className="empty-state"><p>Carregando eventos...</p></div>}
        {!loading && events.length === 0 && <div className="empty-state"><h2>Nenhum evento encontrado</h2><p>Tente remover filtros ou buscar por outro sacramento.</p></div>}
        <div className="events-grid">{events.map((event) => <SearchCard event={event} key={event.eventoId} />)}</div>
      </section>
    </main>
  );
}
