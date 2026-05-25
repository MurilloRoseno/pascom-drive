import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PhotoCard from '../components/PhotoCard.jsx';
import { listarFotosEvento, obterEvento, validarAcessoGaleria } from '../lib/api.js';

export default function EventPage() {
  const { eventoId } = useParams();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const token = useCallback(() => {
    return sessionStorage.getItem(`gallery:${eventoId}`) || '';
  }, [eventoId]);

  const loadPhotos = useCallback((currentEvent) => {
    if (currentEvent.visibility === 'protegida' && !token()) {
      setLoading(false);
      return;
    }
    listarFotosEvento(eventoId, token())
      .then(({ photos: found }) => { setPhotos(found); setLoading(false); })
      .catch((cause) => { setError(cause.message); setLoading(false); });
  }, [eventoId, token]);

  useEffect(() => {
    obterEvento(eventoId)
      .then(({ event: found }) => { setEvent(found); loadPhotos(found); })
      .catch((cause) => { setError(cause.message); setLoading(false); });
  }, [eventoId, loadPhotos]);

  async function unlock(submitEvent) {
    submitEvent.preventDefault();
    setError('');
    try {
      const result = await validarAcessoGaleria(eventoId, code);
      sessionStorage.setItem(`gallery:${eventoId}`, result.token);
      setLoading(true);
      loadPhotos(event);
    } catch (cause) {
      setError(cause.message);
    }
  }

  if (!event && loading) return <main className="event-page"><p className="empty-state">Carregando galeria...</p></main>;
  if (!event) return <main className="event-page"><p className="empty-state">{error || 'Evento nao encontrado.'}</p></main>;

  const locked = event.visibility === 'protegida' && !token();
  return (
    <main className="event-page">
      <section className="event-banner">
        <Link to="/buscar">Eventos / {event.category}</Link>
        <p className="hero-kicker">{event.visibility === 'protegida' ? 'Galeria protegida' : 'Galeria publica'}</p>
        <h1>{event.title}</h1>
        <p>{event.date} · Previews com marca d&apos;agua · Compra segura via Mercado Pago</p>
        {event.salesAuthorized ? <strong className="sales-pill">Venda autorizada</strong> : <strong className="sales-pill muted">Venda indisponivel</strong>}
      </section>
      {locked ? (
        <section className="access-card">
          <h2>Acesso reservado</h2>
          <p>Informe o codigo compartilhado pela secretaria para visualizar e comprar as fotos deste evento.</p>
          <form onSubmit={unlock}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Codigo do evento" />
            <button type="submit">Acessar galeria</button>
          </form>
          {error && <p className="form-error">{error}</p>}
        </section>
      ) : (
        <section className="photo-section">
          <div className="photo-notice">
            <strong>Previa protegida</strong>
            <p>A imagem comprada sera entregue sem marca d&apos;agua apos confirmacao do pagamento.</p>
          </div>
          {loading && <p className="empty-state">Carregando fotos...</p>}
          {!loading && photos.length === 0 && <p className="empty-state">Ainda nao ha fotos disponiveis para compra neste evento.</p>}
          <div className="sales-photo-grid">
            {photos.map((photo) => <PhotoCard key={photo.id} foto={photo} event={event} />)}
          </div>
        </section>
      )}
    </main>
  );
}
