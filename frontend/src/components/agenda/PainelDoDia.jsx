import PropTypes from 'prop-types';
import { agruparPorDia, dataCurta, diaPorExtenso, horario } from '../../lib/datas.js';
import { corDoTipo } from './tipos.js';
import '../../shared/ajuda-agenda.css';

function Item({ o, tipos, acao }) {
  const nomeDoTipo = tipos.find((t) => t.id === o.tipo)?.nome || o.tipo;
  return (
    <li className="aa-item">
      <div className="aa-item__cab">
        <span className="aa-item__hora">{horario(o)}</span>
        <span className="aa-item__tipo" style={{ background: corDoTipo(o.tipo) }}>{nomeDoTipo}</span>
        {o.recorrencia !== 'nenhuma' && (
          <span className="aa-item__rep">· repete {o.recorrencia === 'semanal' ? 'toda semana' : 'todo mês'}</span>
        )}
      </div>
      <p className="aa-item__titulo">{o.titulo}</p>
      {o.local && <p className="aa-item__linha">📍 {o.local}</p>}
      {o.descricao && <p className="aa-item__desc">{o.descricao}</p>}
      {acao && <div className="aa-item__acao">{acao(o)}</div>}
    </li>
  );
}

Item.propTypes = { o: PropTypes.object.isRequired, tipos: PropTypes.array.isRequired, acao: PropTypes.func };

/** Compromissos do dia escolhido. `acao(o)` pode devolver botões (painel). */
export function PainelDoDia({ data, ocorrencias, tipos, acao }) {
  const doDia = ocorrencias.filter((o) => o.data === data);
  return (
    <section aria-label="Compromissos do dia" className="aa aa-card">
      <h3 className="aa-h3">{data ? diaPorExtenso(data) : 'Escolha um dia'}</h3>
      {!data ? (
        <p className="aa-muda">Toque num dia do calendário para ver o que está marcado.</p>
      ) : doDia.length === 0 ? (
        <p className="aa-muda">Nada marcado neste dia.</p>
      ) : (
        <ul className="aa-lista">
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
    <section aria-label="Compromissos do mês" className="aa aa-lista-mes">
      <h3 className="aa-h3">Neste mês</h3>
      {porDia.length === 0 ? (
        <p className="aa-muda">Nenhum compromisso neste mês.</p>
      ) : (
        <ul>
          {porDia.map(([data, itens]) => (
            <li key={data}>
              <button type="button" onClick={() => onSelecionarDia(data)}>
                <span className="aa-lista-mes__data">{dataCurta(data)}</span>
                <span>
                  {itens.map((o) => (
                    <span key={`${o.id}-${o.data}`} className="aa-lista-mes__item">
                      <span style={{ color: corDoTipo(o.tipo) }} aria-hidden="true">● </span>
                      {o.hora ? `${o.hora} ` : ''}{o.titulo}
                      <span className="aa-sr"> ({tipos.find((t) => t.id === o.tipo)?.nome})</span>
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
