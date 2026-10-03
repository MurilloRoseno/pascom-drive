import PropTypes from 'prop-types';
import { corDoTipo } from './tipos.js';
import '../../shared/ajuda-agenda.css';

/** Filtro por tipo: nenhum escolhido = tudo; escolher de novo o mesmo tipo limpa o filtro. */
export default function FiltroTipos({ tipos, valor, onChange }) {
  return (
    <div className="aa aa-chips" role="group" aria-label="Filtrar por tipo de compromisso">
      {tipos.map((t) => {
        const ativo = valor === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(ativo ? null : t.id)}
            className="aa-chip"
            style={{
              background: ativo ? corDoTipo(t.id) : undefined,
              borderColor: corDoTipo(t.id),
              color: ativo ? '#FFFFFF' : undefined,
            }}
          >
            <span aria-hidden="true" className="aa-chip__ponto" style={{ background: ativo ? '#FFFFFF' : corDoTipo(t.id) }} />
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
