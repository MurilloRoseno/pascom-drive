import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { listarEventos } from '../lib/api.js';
import { categories, categoryLabel } from '../data/categories.js';

function monthLabel(key) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key;
  return new Date(`${key}-01T12:00:00`).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

function filterRealEvents(events, data) {
  if (!data) return events;
  return events.filter((event) => String(event.date || '').startsWith(data));
}

function SearchCard({ event }) {
  return (
    <article className="event-card">
      <Link className="event-card-link" to={`/evento/${encodeURIComponent(event.eventoId)}`} aria-label={`Abrir galeria de ${event.title}`}>
        <div className="event-cover">
          <img src={event.cover || '/assets/hero-igreja-sao-rafael.png'} alt={`Galeria de ${event.title}`} loading="lazy" draggable="false" />
          <span className="event-tag">{categoryLabel(event.category)}</span>
          <span className={event.visibility === 'publica' ? 'event-open' : 'event-lock'}>{event.visibility === 'publica' ? 'Galeria pública' : 'Galeria protegida'}</span>
        </div>
        <div className="event-body">
          <h3>{event.title}</h3>
          <ul className="event-meta"><li>{event.dateLabel || event.date || 'Data a confirmar'}</li><li>{event.location || 'Paróquia São Rafael'}</li></ul>
          {event.salesAuthorized && <p className="card-sale">Fotos disponíveis para compra</p>}
          <span className="event-link">Ver fotos →</span>
        </div>
      </Link>
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
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const query = params.get('q') || '';
  const category = params.get('categoria') || '';
  const date = params.get('data') || '';

  useEffect(() => {
    setForm({ q: query, categoria: category, data: date });
    setLoading(true);
    setLoadError('');
    listarEventos({ q: query, categoria: category })
      .then(({ eventos }) => {
        setEvents(filterRealEvents(eventos, date));
        setLoading(false);
      })
      .catch(() => {
        setEvents([]);
        setLoadError('Não foi possível carregar os eventos publicados agora. Tente novamente em instantes.');
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
            <input name="data" type="month" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} aria-label="Filtrar por mês" />
          </label>
          <button className="btn-primary" type="submit">Buscar</button>
        </form>
      </div>
      <section className="main-content" aria-live="polite">
        {filters.length > 0 && <div className="chips">{filters.map((filter) => <span className="chip" key={filter}>{filter}</span>)}</div>}
        <div className="section-toolbar">
          <div>
            <h2>{category ? categoryLabel(category) : 'Eventos em destaque'}</h2>
            {!loading && <p className="result-count">{events.length} evento{events.length === 1 ? '' : 's'} encontrado{events.length === 1 ? '' : 's'}</p>}
          </div>
          <Link className="clear-link" to="/buscar">Limpar filtros</Link>
        </div>
        {loadError && <div className="notice">{loadError}</div>}
        {loading && <div className="empty-state"><p>Carregando eventos...</p></div>}
        {!loading && events.length === 0 && <div className="empty-state"><h2>Nenhum evento encontrado</h2><p>Tente remover filtros ou buscar por outro sacramento.</p></div>}
        <div className="events-grid">{events.map((event) => <SearchCard event={event} key={event.eventoId} />)}</div>
      </section>
    </main>
  );
}
