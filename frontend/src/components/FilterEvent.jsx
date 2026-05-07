import PropTypes from 'prop-types';

export default function FilterEvent({ eventos, eventoSelecionado, onSelect }) {
  return (
    <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
      <button
        onClick={() => onSelect(null)}
        className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
        style={
          !eventoSelecionado
            ? {
                background: 'var(--photo-primary)',
                color: '#fff',
                border: '1.5px solid var(--photo-primary)',
              }
            : {
                background: 'transparent',
                color: 'var(--photo-primary)',
                border: '1.5px solid rgba(109,32,119,0.35)',
              }
        }
      >
        Todos
      </button>

      {eventos.map(evento => (
        <button
          key={evento}
          onClick={() => onSelect(evento)}
          className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
          style={
            eventoSelecionado === evento
              ? {
                  background: 'var(--photo-primary)',
                  color: '#fff',
                  border: '1.5px solid var(--photo-primary)',
                }
              : {
                  background: 'transparent',
                  color: 'var(--photo-primary)',
                  border: '1.5px solid rgba(109,32,119,0.35)',
                }
          }
        >
          {evento}
        </button>
      ))}
    </div>
  );
}

FilterEvent.propTypes = {
  eventos: PropTypes.arrayOf(PropTypes.string).isRequired,
  eventoSelecionado: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};
