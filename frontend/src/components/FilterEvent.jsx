import PropTypes from 'prop-types';

export default function FilterEvent({ eventos, eventoSelecionado, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`badge cursor-pointer border transition-colors duration-base ${
          !eventoSelecionado ? 'badge--roxo' : ''
        }`}
        style={!eventoSelecionado ? {} : {
          borderColor: 'rgba(109,32,119,0.3)',
          color: 'var(--photo-primary)',
          background: 'transparent',
        }}
      >
        Todos
      </button>
      {eventos.map(evento => (
        <button
          key={evento}
          onClick={() => onSelect(evento)}
          className={`badge cursor-pointer border transition-colors duration-base ${
            eventoSelecionado === evento ? 'badge--roxo' : ''
          }`}
          style={eventoSelecionado === evento ? {} : {
            borderColor: 'rgba(109,32,119,0.3)',
            color: 'var(--photo-primary)',
            background: 'transparent',
          }}
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
