import PropTypes from 'prop-types';

export default function FilterEvent({ eventos, eventoSelecionado, onSelect }) {
  const todos = ['Todos', ...eventos];

  return (
    <div
      className="flex gap-3 overflow-x-auto mb-5"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', padding: '0.25rem 0 0.5rem' }}
      role="group"
      aria-label="Filtrar por evento"
    >
      {todos.map((ev) => {
        const ativo = (eventoSelecionado === null && ev === 'Todos') || eventoSelecionado === ev;
        return (
          <button
            key={ev}
            onClick={() => onSelect(ev === 'Todos' ? null : ev)}
            aria-pressed={ativo}
            className="flex-shrink-0 rounded-full font-semibold transition-all whitespace-nowrap"
            style={{
              minHeight: 'var(--touch-sm)',
              padding: '0 1.25rem',
              fontSize: 'var(--text-sm)',
              background: ativo ? 'var(--photo-primary)' : 'white',
              color: ativo ? 'white' : 'var(--photo-primary)',
              border: `2px solid ${ativo ? 'var(--photo-primary)' : 'rgba(109,32,119,0.35)'}`,
              fontFamily: 'var(--font-body)',
              boxShadow: ativo ? '0 2px 8px rgba(109,32,119,0.3)' : 'none',
              cursor: 'pointer',
            }}
          >
            {ev}
          </button>
        );
      })}
    </div>
  );
}

FilterEvent.propTypes = {
  eventos: PropTypes.arrayOf(PropTypes.string).isRequired,
  eventoSelecionado: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};
