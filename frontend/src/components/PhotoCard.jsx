import PropTypes from 'prop-types';
import { useCarrinho } from '../hooks/useCarrinho.js';

export default function PhotoCard({ foto }) {
  const { isSelected, addFoto, removeFoto } = useCarrinho();
  const selected = isSelected(foto.id);

  const toggle = () => selected ? removeFoto(foto.id) : addFoto(foto);

  return (
    <div
      onClick={toggle}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && toggle()}
      className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200
        ${selected
          ? 'ring-4 shadow-lg'
          : 'hover:shadow-md'
        }`}
      style={selected ? { ringColor: 'var(--photo-accent)', boxShadow: '0 0 0 4px var(--photo-accent)' } : {}}
    >
      <img src={foto.url} alt={foto.event} className="w-full aspect-[2/3] object-cover" />

      {/* Checkmark */}
      <div
        className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center"
        style={selected
          ? { background: 'var(--photo-accent)', borderColor: 'var(--photo-accent)' }
          : { background: 'rgba(255,255,255,0.85)', borderColor: 'white' }
        }
      >
        {selected && <span className="text-xs font-bold" style={{ color: 'var(--photo-primary-dark)' }}>✓</span>}
      </div>

      {/* Selected badge */}
      {selected && (
        <div className="absolute top-2 left-2">
          <span className="badge badge--ok">Selecionado</span>
        </div>
      )}

      {/* Price overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end justify-between">
        <span className="badge badge--amarelo">
          R$ {foto.price.toFixed(2).replace('.', ',')}
        </span>
      </div>
    </div>
  );
}

PhotoCard.propTypes = {
  foto: PropTypes.shape({
    id: PropTypes.string.isRequired,
    event: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
  }).isRequired,
};
