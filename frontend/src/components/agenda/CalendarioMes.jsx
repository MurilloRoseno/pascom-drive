import PropTypes from 'prop-types';
import {
  DIAS_CURTOS, agruparPorDia, diaPorExtenso, gradeDoMes, tituloDoMes,
} from '../../lib/datas.js';
import { corDoTipo, fundoDoTipo } from './tipos.js';
import '../../shared/ajuda-agenda.css';

const MAX_CHIPS = 3;

function Dia({ celula, hoje, selecionado, itens, onSelecionar }) {
  const numero = Number(celula.data.slice(8, 10));
  const ehHoje = celula.data === hoje;
  const rotulo = `${diaPorExtenso(celula.data)}, ${itens.length === 0 ? 'nenhum compromisso' : `${itens.length} ${itens.length === 1 ? 'compromisso' : 'compromissos'}`}`;

  return (
    <button
      type="button"
      onClick={() => onSelecionar(celula.data)}
      aria-label={rotulo}
      aria-pressed={selecionado}
      aria-current={ehHoje ? 'date' : undefined}
      className="aa-dia"
      style={{ opacity: celula.doMes ? 1 : 0.42 }}
    >
      <span className="aa-dia__num">{numero}</span>

      {/* telas grandes: chips com o título */}
      <span className="aa-dia__chips">
        {itens.slice(0, MAX_CHIPS).map((o) => (
          <span
            key={`${o.id}-${o.data}`}
            title={`${o.hora ? `${o.hora} ` : ''}${o.titulo}`}
            className="aa-chip-evento"
            style={{ background: fundoDoTipo(o.tipo) }}
          >
            <span aria-hidden="true" className="aa-chip-evento__ponto" style={{ background: corDoTipo(o.tipo) }} />
            <span>{o.hora ? `${o.hora} ` : ''}{o.titulo}</span>
          </span>
        ))}
        {itens.length > MAX_CHIPS && <span className="aa-mais">+{itens.length - MAX_CHIPS} mais</span>}
      </span>

      {/* celular: só pontos coloridos; o dia selecionado mostra os detalhes embaixo */}
      <span className="aa-dia__pontos" aria-hidden="true">
        {itens.slice(0, 4).map((o) => (
          <span key={`${o.id}-${o.data}`} className="aa-dia__ponto" style={{ background: corDoTipo(o.tipo) }} />
        ))}
      </span>
    </button>
  );
}

Dia.propTypes = {
  celula: PropTypes.shape({ data: PropTypes.string, doMes: PropTypes.bool }).isRequired,
  hoje: PropTypes.string,
  selecionado: PropTypes.bool,
  itens: PropTypes.array.isRequired,
  onSelecionar: PropTypes.func.isRequired,
};

/**
 * Grade do mês (42 células, domingo primeiro). Mostra até 3 compromissos por dia e
 * "+N mais"; o dia escolhido abre os detalhes no painel ao lado ou abaixo.
 */
export default function CalendarioMes({
  mes, hoje, ocorrencias, diaSelecionado, onSelecionarDia, onMudarMes, onHoje,
}) {
  const porDia = agruparPorDia(ocorrencias);
  const titulo = tituloDoMes(mes);

  return (
    <div className="aa">
      <div className="aa-cal-cab">
        <h2 className="aa-h2" aria-live="polite">{titulo}</h2>
        <button type="button" onClick={() => onMudarMes(-1)} aria-label="Mês anterior" className="aa-btn">←</button>
        <button type="button" onClick={onHoje} className="aa-btn">Hoje</button>
        <button type="button" onClick={() => onMudarMes(1)} aria-label="Próximo mês" className="aa-btn">→</button>
      </div>

      <div role="group" aria-label={`Calendário de ${titulo}`}>
        <div className="aa-cal-semana" aria-hidden="true">
          {DIAS_CURTOS.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="aa-cal-dias">
          {gradeDoMes(mes).map((celula) => (
            <Dia
              key={celula.data}
              celula={celula}
              hoje={hoje}
              selecionado={celula.data === diaSelecionado}
              itens={porDia.get(celula.data) || []}
              onSelecionar={onSelecionarDia}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

CalendarioMes.propTypes = {
  mes: PropTypes.string.isRequired,
  hoje: PropTypes.string,
  ocorrencias: PropTypes.array.isRequired,
  diaSelecionado: PropTypes.string,
  onSelecionarDia: PropTypes.func.isRequired,
  onMudarMes: PropTypes.func.isRequired,
  onHoje: PropTypes.func.isRequired,
};
