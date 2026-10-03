import PropTypes from 'prop-types';
import { agruparPorDia, dataCurta, diaPorExtenso, horario } from '../../lib/datas.js';
import { corDoTipo } from './tipos.js';

function Item({ o, tipos, acao }) {
  const nomeDoTipo = tipos.find((t) => t.id === o.tipo)?.nome || o.tipo;
  return (
    <li className="rounded-xl p-3" style={{ background: 'var(--photo-paper)', border: '1px solid rgba(109,32,119,0.10)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--photo-grafite)' }}>{horario(o)}</span>
        <span
          className="rounded-full px-2 py-0.5 font-semibold"
          style={{ fontSize: '0.8125rem', color: 'white', background: corDoTipo(o.tipo) }}
        >
          {nomeDoTipo}
        </span>
        {o.recorrencia !== 'nenhuma' && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--photo-grafite)' }}>
            · repete {o.recorrencia === 'semanal' ? 'toda semana' : 'todo mês'}
          </span>
        )}
      </div>
      <p className="mt-1 font-bold" style={{ fontSize: 'var(--text-base)' }}>{o.titulo}</p>
      {o.local && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--photo-grafite)' }}>📍 {o.local}</p>}
      {o.descricao && <p className="mt-1" style={{ fontSize: 'var(--text-sm)' }}>{o.descricao}</p>}
      {acao && <div className="mt-2">{acao(o)}</div>}
    </li>
  );
}

Item.propTypes = { o: PropTypes.object.isRequired, tipos: PropTypes.array.isRequired, acao: PropTypes.func };

/** Compromissos do dia escolhido. `acao(o)` pode devolver botões (painel). */
export function PainelDoDia({ data, ocorrencias, tipos, acao }) {
  const doDia = ocorrencias.filter((o) => o.data === data);
  return (
    <section aria-label="Compromissos do dia" className="card">
      <h3 className="font-display font-bold" style={{ fontSize: 'var(--text-lg)', textTransform: 'capitalize' }}>
        {data ? diaPorExtenso(data) : 'Escolha um dia'}
      </h3>
      {!data ? (
        <p className="mt-2" style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>Toque num dia do calendário para ver o que está marcado.</p>
      ) : doDia.length === 0 ? (
        <p className="mt-2" style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>Nada marcado neste dia.</p>
      ) : (
        <ul className="mt-3 space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {doDia.map((o) => <Item key={`${o.id}-${o.data}`} o={o} tipos={tipos} acao={acao} />)}
        </ul>
      )}
    </section>
  );
}

PainelDoDia.propTypes = {
  data: PropTypes.string,
  ocorrencias: PropTypes.array.isRequired,
  tipos: PropTypes.array.isRequired,
  acao: PropTypes.func,
};

/** Lista do mês inteiro, só os dias com compromisso: a leitura natural no celular. */
export function ListaDoMes({ mes, ocorrencias, tipos, onSelecionarDia }) {
  const doMes = ocorrencias.filter((o) => o.data.slice(0, 7) === mes);
  const porDia = [...agruparPorDia(doMes)];
  return (
    <section aria-label="Compromissos do mês" className="sm:hidden">
      <h3 className="mb-2 font-display font-bold" style={{ fontSize: 'var(--text-lg)' }}>Neste mês</h3>
      {porDia.length === 0 ? (
        <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>Nenhum compromisso neste mês.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-2">
          {porDia.map(([data, itens]) => (
            <li key={data}>
              <button
                type="button"
                onClick={() => onSelecionarDia(data)}
                className="flex w-full items-start gap-3 rounded-xl p-3 text-left"
                style={{ background: 'white', border: '1px solid rgba(24,21,15,0.12)', minHeight: 'var(--touch-md)', cursor: 'pointer' }}
              >
                <span className="font-mono font-bold" style={{ color: 'var(--photo-primary)', minWidth: '3rem' }}>{dataCurta(data)}</span>
                <span>
                  {itens.map((o) => (
                    <span key={`${o.id}-${o.data}`} className="block" style={{ fontSize: 'var(--text-base)' }}>
                      <span style={{ color: corDoTipo(o.tipo) }} aria-hidden="true">● </span>
                      {o.hora ? `${o.hora} ` : ''}{o.titulo}
                      <span className="sr-only"> ({tipos.find((t) => t.id === o.tipo)?.nome})</span>
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

ListaDoMes.propTypes = {
  mes: PropTypes.string.isRequired,
  ocorrencias: PropTypes.array.isRequired,
  tipos: PropTypes.array.isRequired,
  onSelecionarDia: PropTypes.func.isRequired,
};
