import PropTypes from 'prop-types';

export default function FilterEvent({ eventos, eventoSelecionado, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`btn ${!eventoSelecionado ? 'btn-primary' : 'btn-outline'}`}
      >
        Todos
      </button>
      {eventos.map(evento => (
        <button
          key={evento}
          onClick={() => onSelect(evento)}
          className={`btn ${eventoSelecionado === evento ? 'btn-primary' : 'btn-outline'}`}
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
