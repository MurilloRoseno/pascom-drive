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
      className="relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 select-none"
      style={selected ? { boxShadow: '0 0 0 3px var(--photo-accent), 0 4px 12px rgba(0,0,0,0.2)' } : {}}
    >
      <div className="photo-blur-target relative w-full aspect-[2/3] overflow-hidden">
        <img
          src={foto.url}
          alt={foto.event}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
          className="w-full h-full object-cover select-none pointer-events-none"
        />
        {/* transparent shield — blocks right-click/drag on the img element */}
        <div className="absolute inset-0" style={{ zIndex: 1 }} />
      </div>

      {selected && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(109,32,119,0.35)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--photo-accent)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              style={{ color: 'var(--photo-primary-dark)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
      >
        <span
          className="font-mono font-bold text-xs"
          style={{ color: '#fff' }}
        >
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
