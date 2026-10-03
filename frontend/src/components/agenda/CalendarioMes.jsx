import PropTypes from 'prop-types';
import {
  DIAS_CURTOS, agruparPorDia, diaPorExtenso, gradeDoMes, tituloDoMes,
} from '../../lib/datas.js';
import { corDoTipo, fundoDoTipo } from './tipos.js';

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
      className="flex min-h-[58px] flex-col items-stretch gap-1 rounded-lg p-1 text-left sm:min-h-[104px] sm:p-2"
      style={{
        opacity: celula.doMes ? 1 : 0.42,
        background: 'white',
        border: selecionado ? '2px solid var(--photo-primary)' : '1px solid rgba(24,21,15,0.12)',
        cursor: 'pointer',
      }}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full font-bold"
        style={{ fontSize: 'var(--text-sm)', background: ehHoje ? 'var(--photo-primary)' : 'transparent', color: ehHoje ? 'white' : 'var(--photo-ink)' }}
      >
        {numero}
      </span>

      {/* telas grandes: chips com o título */}
      <span className="hidden flex-col gap-1 sm:flex">
        {itens.slice(0, MAX_CHIPS).map((o) => (
          <span
            key={`${o.id}-${o.data}`}
            title={`${o.hora ? `${o.hora} ` : ''}${o.titulo}`}
            className="flex items-center gap-1 truncate rounded px-1.5 py-0.5"
            style={{ fontSize: '0.8125rem', background: fundoDoTipo(o.tipo) }}
          >
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: corDoTipo(o.tipo), flexShrink: 0 }} />
            <span className="truncate">{o.hora ? `${o.hora} ` : ''}{o.titulo}</span>
          </span>
        ))}
        {itens.length > MAX_CHIPS && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--photo-grafite)' }}>+{itens.length - MAX_CHIPS} mais</span>
        )}
      </span>

      {/* celular: só pontos coloridos; o dia selecionado mostra os detalhes embaixo */}
      <span className="flex flex-wrap gap-1 sm:hidden" aria-hidden="true">
        {itens.slice(0, 4).map((o) => (
          <span key={`${o.id}-${o.data}`} style={{ width: 8, height: 8, borderRadius: 99, background: corDoTipo(o.tipo) }} />
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
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-display font-bold" style={{ fontSize: 'var(--text-xl)', color: 'var(--photo-primary-dark)', textTransform: 'capitalize' }} aria-live="polite">
          {titulo}
        </h2>
        <button type="button" onClick={() => onMudarMes(-1)} aria-label="Mês anterior" className="btn btn-outline" style={{ minWidth: 'var(--touch-sm)' }}>←</button>
        <button type="button" onClick={onHoje} className="btn btn-outline">Hoje</button>
        <button type="button" onClick={() => onMudarMes(1)} aria-label="Próximo mês" className="btn btn-outline" style={{ minWidth: 'var(--touch-sm)' }}>→</button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label={`Calendário de ${titulo}`}>
        {DIAS_CURTOS.map((d) => (
          <div key={d} className="py-1 text-center font-mono uppercase" style={{ fontSize: '0.75rem', color: 'var(--photo-grafite)' }} aria-hidden="true">{d}</div>
        ))}
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
