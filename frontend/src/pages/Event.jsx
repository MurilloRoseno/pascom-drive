import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { listarFotosEvento, obterEvento, validarAcessoGaleria } from '../lib/api.js';
import { categoryLabel } from '../data/categories.js';
import { dateLabel } from '../lib/event-format.js';

function eventToken(eventoId) {
  return sessionStorage.getItem(`gallery:${eventoId}`) || '';
}

function formatPhoto(photo) {
  return {
    ...photo,
    previewUrl: photo.previewUrl || photo.url,
    thumbnailUrl: photo.thumbnailUrl || photo.thumb || photo.previewUrl || photo.url,
    caption: photo.caption || 'Registro da galeria paroquial.',
  };
}

export default function EventPage() {
  const { eventoId } = useParams();
  const [params, setParams] = useSearchParams();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const closeRef = useRef(null);
  const { addFoto, removeFoto, isSelected } = useCarrinho();

  const loadPhotos = useCallback(async (currentEvent) => {
    if (currentEvent.visibility === 'protegida' && !eventToken(eventoId)) {
      setLoading(false);
      return;
    }
    const result = await listarFotosEvento(eventoId, eventToken(eventoId));
    setPhotos(result.photos.map((photo) => formatPhoto({ ...photo, watermarkedPreview: true })));
    setLoading(false);
  }, [eventoId]);

  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]');
    const previous = robots?.getAttribute('content');
    robots?.setAttribute('content', 'noindex, noimageindex, noarchive');
    setLoading(true);
    setError('');
    obterEvento(eventoId)
      .then(({ event: found }) => {
        setEvent(found);
        return loadPhotos(found);
      })
      .catch(() => {
        setError('Esta galeria não está disponível ou o endereço informado não é válido.');
        setLoading(false);
      });
    return () => robots?.setAttribute('content', previous || 'index, follow');
  }, [eventoId, loadPhotos]);

  const photoId = params.get('foto');
  const activeIndex = photos.findIndex((photo) => photo.id === photoId);
  const activePhoto = activeIndex >= 0 ? photos[activeIndex] : null;

  const changePhoto = useCallback((direction) => {
    if (!photos.length) return;
    const next = (activeIndex + direction + photos.length) % photos.length;
    setParams({ foto: photos[next].id }, { replace: true });
  }, [activeIndex, photos, setParams]);

  useEffect(() => {
    if (!activePhoto) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === 'Escape') setParams({}, { replace: true });
      if (keyEvent.key === 'ArrowLeft') changePhoto(-1);
      if (keyEvent.key === 'ArrowRight') changePhoto(1);
    };
    document.body.classList.add('lightbox-open');
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('lightbox-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activePhoto, changePhoto, setParams]);

  async function unlock(submitEvent) {
    submitEvent.preventDefault();
    setError('');
    try {
      const result = await validarAcessoGaleria(eventoId, code);
      sessionStorage.setItem(`gallery:${eventoId}`, result.token);
      setLoading(true);
      await loadPhotos(event);
    } catch (cause) {
      setError(cause.message);
    }
  }

  function togglePurchase(photo) {
    if (!event.salesAuthorized || photo.availableForSale !== true) return;
    if (isSelected(photo.id)) {
      removeFoto(photo.id);
    } else {
      addFoto({ ...photo, event: event.title, eventoId: event.eventoId, url: photo.previewUrl });
    }
  }

  if (!event && loading) return <main><div className="main-content"><div className="empty-state"><p>Carregando galeria...</p></div></div></main>;
  if (!event) {
    return (
      <main><div className="main-content"><div className="empty-state"><h2>Evento não encontrado</h2><p>{error}</p><Link className="btn-primary" to="/buscar">Encontrar eventos</Link></div></div></main>
    );
  }

  const locked = event.visibility === 'protegida' && !eventToken(eventoId);
  const canBuy = event.salesAuthorized;
  const canBuyActivePhoto = canBuy && activePhoto?.availableForSale === true;

  return (
    <main className="event-detail-page">
      <section className="page-hero event-hero">
        <div className="event-overview">
          <div>
            <div className="breadcrumb"><Link to="/">Início</Link><span>/</span><Link to="/buscar">Eventos</Link><span>/</span><Link to={`/buscar?categoria=${event.category}`}>{categoryLabel(event.category)}</Link></div>
            <p className="eyebrow">{categoryLabel(event.category)}</p>
            <h1 className="page-title">{event.title}</h1>
            <p className="page-summary">{event.description}</p>
            <ul className="event-details">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg><span>{dateLabel(event)}</span></li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg><span>{event.time || 'Horário a confirmar'}</span></li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg><span>{event.location || 'Paróquia São Rafael'}</span></li>
            </ul>
          </div>
          <div className="event-cover-large"><img src={event.cover || '/assets/hero-igreja-sao-rafael.webp'} alt={`Capa de ${event.title}`} decoding="async" draggable="false" /></div>
        </div>
      </section>
      <section className="main-content">
        {error && !locked && <div className="notice">{error}</div>}
        {photoId && !activePhoto && photos.length > 0 && <div className="notice">A foto solicitada não foi encontrada. Você ainda pode explorar a galeria deste evento.</div>}
        {locked ? (
          <div className="access-card">
            <h2>Acesso reservado</h2>
            <p>Informe o código compartilhado pela secretaria para visualizar as prévias protegidas deste evento.</p>
            <form onSubmit={unlock}>
              <input value={code} onChange={(codeEvent) => setCode(codeEvent.target.value.toUpperCase())} placeholder="Código do evento" aria-label="Código do evento" />
              <button className="btn-primary" type="submit">Acessar galeria</button>
            </form>
            {error && <p className="form-error">{error}</p>}
          </div>
        ) : (
          <>
            <div className="gallery-header">
              <div><h2 className="gallery-title">Fotos do evento</h2><p className="gallery-note">{event.visibility === 'protegida' ? 'Prévia protegida com marca d água.' : 'Galeria institucional aberta.'}</p></div>
              <span className="gallery-count">{photos.length} foto{photos.length === 1 ? '' : 's'}</span>
            </div>
            {loading && <div className="empty-state"><p>Carregando fotos...</p></div>}
            {!loading && photos.length === 0 && <div className="empty-state"><p>Ainda não há fotos disponíveis neste evento.</p></div>}
            <div className="photo-grid">
              {photos.map((photo) => {
                const selected = isSelected(photo.id);
                const selectable = canBuy && photo.availableForSale === true;
                return (
                  <article className={`photo-tile${selected ? ' is-selected' : ''}`} key={photo.id}>
                    <button className="photo-button" type="button" onClick={() => setParams({ foto: photo.id })} onContextMenu={(mouseEvent) => mouseEvent.preventDefault()}>
                      <img className={photo.watermarkedPreview ? 'photo-blur-target' : undefined} src={photo.thumbnailUrl} alt={photo.alt || photo.caption} loading="lazy" decoding="async" draggable="false" onContextMenu={(mouseEvent) => mouseEvent.preventDefault()} />
                      <span className={photo.watermarkedPreview ? 'preview-chip' : 'public-chip'}>{photo.watermarkedPreview ? 'Prévia protegida' : 'Galeria pública'}</span>
                      {selected && <span className="selected-chip">Selecionada</span>}
                    </button>
                    {selectable && (
                      <button className={`photo-select${selected ? ' selected' : ''}`} type="button" onClick={() => togglePurchase(photo)}>
                        {selected ? 'Remover seleção' : `Selecionar foto - R$ ${Number(photo.price || 10).toFixed(2).replace('.', ',')}`}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
      {activePhoto && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visualização da foto">
          <div className="lightbox-dialog">
            <div className="lightbox-image-wrap"><img className={`lightbox-image ${activePhoto.watermarkedPreview ? 'photo-blur-target' : ''}`} src={activePhoto.previewUrl} alt={activePhoto.alt || activePhoto.caption} decoding="async" draggable="false" onContextMenu={(mouseEvent) => mouseEvent.preventDefault()} /></div>
            <div className="lightbox-panel">
              <button className="lightbox-close" ref={closeRef} type="button" onClick={() => setParams({}, { replace: true })} aria-label="Fechar foto">×</button>
              <h2>{event.title}</h2>
              <p className="lightbox-caption">{activePhoto.caption}</p>
              {(activePhoto.watermarkedPreview || canBuyActivePhoto) && (
                <div className="lightbox-security">
                  <strong>{activePhoto.watermarkedPreview ? 'Prévia protegida' : 'Galeria pública'}</strong>
                  {canBuyActivePhoto && <span>A foto adquirida será entregue sem marca d água.</span>}
                </div>
              )}
              <div className="lightbox-actions">
                <div className="gallery-nav">
                  <button className="ghost-button" type="button" onClick={() => changePhoto(-1)}>Anterior</button>
                  <button className="ghost-button" type="button" onClick={() => changePhoto(1)}>Próxima</button>
                </div>
                {canBuyActivePhoto && (
                  <button className="purchase-button" type="button" onClick={() => togglePurchase(activePhoto)}>
                    {isSelected(activePhoto.id) ? 'Remover do carrinho' : 'Selecionar por R$ 10,00'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
