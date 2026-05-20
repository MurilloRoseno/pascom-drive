import PropTypes from 'prop-types';
import { useCarrinho } from '../hooks/useCarrinho.js';

export default function PhotoCard({ foto }) {
  const { isSelected, addFoto, removeFoto } = useCarrinho();
  const selected = isSelected(foto.id);

  const toggle = () => selected ? removeFoto(foto.id) : addFoto(foto);

  return (
    <article
      onClick={toggle}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && toggle()}
      onContextMenu={(e) => e.preventDefault()}
      className="relative cursor-pointer select-none rounded-xl overflow-hidden"
      style={{
        border: selected ? '3px solid var(--photo-primary)' : '3px solid transparent',
        boxShadow: selected
          ? '0 0 0 3px rgba(109,32,119,0.25), 0 4px 16px rgba(0,0,0,0.15)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        background: '#f0ebe3',
      }}
    >
      {/* Imagem */}
      <div className="photo-blur-target relative w-full aspect-[2/3] overflow-hidden">
        <img
          src={foto.url}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          loading="lazy"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        {/* Shield anti-drag */}
        <div className="absolute inset-0" style={{ zIndex: 1 }} />
      </div>

      {/* Overlay de seleção */}
      {selected && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(109,32,119,0.4)', zIndex: 2 }}
        >
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 60, height: 60, background: 'var(--photo-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
                 stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      )}

      {/* Preço + label — sempre visível na base */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3"
        style={{
          background: selected
            ? 'var(--photo-primary)'
            : 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 100%)',
          minHeight: '48px',
          zIndex: 3,
        }}
      >
        <span
          className="text-white font-bold"
          style={{ fontSize: 'var(--text-sm)', textShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.5)' }}
        >
          R$ {Number(foto.price).toFixed(2).replace('.', ',')}
        </span>
        {selected && (
          <span className="text-white font-semibold" style={{ fontSize: 'var(--text-xs)' }}>
            ✓ Selecionada
          </span>
        )}
      </div>
    </article>
  );
}

PhotoCard.propTypes = {
  foto: PropTypes.shape({
    id:    PropTypes.string.isRequired,
    event: PropTypes.string.isRequired,
    url:   PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
  }).isRequired,
};
