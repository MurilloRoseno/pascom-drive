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
        ${selected ? 'ring-4 ring-photo-accent shadow-lg' : 'hover:shadow-md'}`}
    >
      <img src={foto.url} alt={foto.event} className="w-full aspect-[2/3] object-cover" />
      <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center
        ${selected ? 'bg-photo-accent border-photo-accent' : 'bg-white/80 border-white'}`}>
        {selected && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <p className="text-white text-sm">
          R$ {foto.price.toFixed(2).replace('.', ',')}
        </p>
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
