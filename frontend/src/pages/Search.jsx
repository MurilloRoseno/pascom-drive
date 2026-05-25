import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api.js';

const categories = [
  ['celebracoes', 'Celebracoes'], ['batismo', 'Batismo'], ['eucaristia', 'Eucaristia'],
  ['crisma', 'Crisma'], ['casamento', 'Casamento'],
  ['uncao-dos-enfermos', 'Uncao dos Enfermos'], ['ordem', 'Ordem'],
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [events, setEvents] = useState([]);
  const [state, setState] = useState('loading');
  const category = params.get('categoria') || '';

  useEffect(() => {
    setState('loading');
    listarEventos({ q: params.get('q') || '', categoria: category })
      .then(({ eventos }) => { setEvents(eventos); setState('ready'); })
      .catch(() => setState('error'));
  }, [params, category]);

  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (q.trim()) next.set('q', q.trim()); else next.delete('q');
    setParams(next);
  }

  function chooseCategory(id) {
    const next = new URLSearchParams(params);
    if (id === category) next.delete('categoria'); else next.set('categoria', id);
    setParams(next);
  }

  return (
    <main className="search-page">
      <section className="gallery-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Galeria paroquial</p>
          <h1>Encontre as fotos da <span>Paroquia Sao Rafael</span></h1>
          <p>Celebracoes e sacramentos fotografados com cuidado, acesso protegido e compra segura.</p>
          <form className="event-search" onSubmit={submit}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque por evento, data ou sacramento..." aria-label="Buscar evento" />
            <button type="submit">Buscar</button>
          </form>
        </div>
      </section>
      <section className="catalog-section">
        <div className="category-chips" aria-label="Categorias">
          {categories.map(([id, label]) => (
            <button type="button" key={id} className={category === id ? 'active' : ''} onClick={() => chooseCategory(id)}>{label}</button>
          ))}
        </div>
        <div className="results-head">
          <div>
            <p className="hero-kicker">Eventos publicados</p>
            <h2>{category ? categories.find(([id]) => id === category)?.[1] : 'Todas as galerias'}</h2>
          </div>
          {state === 'ready' && <span>{events.length} evento{events.length !== 1 ? 's' : ''}</span>}
        </div>
        {state === 'loading' && <p className="empty-state">Carregando eventos...</p>}
        {state === 'error' && <p className="empty-state">Nao foi possivel carregar os eventos agora.</p>}
        {state === 'ready' && events.length === 0 && <p className="empty-state">Nenhum evento publicado nesta categoria ainda.</p>}
        <div className="event-grid">
          {events.map((event) => (
            <article className="event-tile" key={event.eventoId}>
              <div className="event-tile-cover">
                <span>{event.visibility === 'protegida' ? 'Galeria protegida' : 'Galeria publica'}</span>
              </div>
              <div className="event-tile-body">
                <p>{event.category}</p>
                <h3>{event.title}</h3>
                <time>{event.date || 'Data a confirmar'}</time>
                {event.salesAuthorized && <strong>Fotos disponiveis para compra</strong>}
                <Link to={`/evento/${encodeURIComponent(event.eventoId)}`}>Ver fotos</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
