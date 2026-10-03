import PropTypes from 'prop-types';
import { corDoTipo } from './tipos.js';

/** Filtro por tipo: nenhum escolhido = tudo; escolher de novo o mesmo tipo limpa o filtro. */
export default function FiltroTipos({ tipos, valor, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filtrar por tipo de compromisso" style={{ padding: '0.25rem 0' }}>
      {tipos.map((t) => {
        const ativo = valor === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(ativo ? null : t.id)}
            className="flex flex-shrink-0 items-center gap-2 rounded-full font-semibold whitespace-nowrap"
            style={{
              minHeight: 'var(--touch-sm)',
              padding: '0 1rem',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              background: ativo ? corDoTipo(t.id) : 'white',
              color: ativo ? 'white' : 'var(--photo-ink)',
              border: `2px solid ${corDoTipo(t.id)}`,
            }}
          >
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 99, background: ativo ? 'white' : corDoTipo(t.id) }} />
            {t.nome}
          </button>
        );
      })}
    </div>
  );
}

FiltroTipos.propTypes = {
  tipos: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, nome: PropTypes.string })).isRequired,
  valor: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
