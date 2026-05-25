import PropTypes from 'prop-types';
import { useCarrinho } from '../hooks/useCarrinho.js';

export default function PhotoCard({ foto, event }) {
  const { isSelected, addFoto, removeFoto } = useCarrinho();
  const eventTitle = event?.title || foto.event || 'Evento paroquial';
  const eventoId = event?.eventoId || foto.eventoId || '';
  const previewUrl = foto.previewUrl || foto.url;
  const canBuy = event?.salesAuthorized !== false && foto.availableForSale !== false;
  const selected = isSelected(foto.id);
  const toggle = () => {
    if (!canBuy) return;
    return selected ? removeFoto(foto.id) : addFoto({
      ...foto,
      event: eventTitle,
      eventoId,
      url: previewUrl,
    });
  };
  return (
    <article className={`sales-photo ${selected ? 'is-selected' : ''}`}>
      <button type="button" onClick={toggle} aria-pressed={selected} disabled={!canBuy}>
        <img src={previewUrl} alt={`Previa protegida - ${eventTitle}`} loading="lazy" draggable="false" onContextMenu={(e) => e.preventDefault()} />
        <span className="watermark-badge">PREVIA PROTEGIDA</span>
        <span className="price">R$ {Number(foto.price).toFixed(2).replace('.', ',')}</span>
        <strong>{!canBuy ? 'Compra indisponivel' : selected ? 'Selecionada' : 'Adicionar'}</strong>
      </button>
    </article>
  );
}

PhotoCard.propTypes = {
  foto: PropTypes.shape({ id: PropTypes.string.isRequired, previewUrl: PropTypes.string, url: PropTypes.string, event: PropTypes.string, eventoId: PropTypes.string, price: PropTypes.number.isRequired, availableForSale: PropTypes.bool }).isRequired,
  event: PropTypes.shape({ title: PropTypes.string.isRequired, eventoId: PropTypes.string.isRequired, salesAuthorized: PropTypes.bool }),
};
