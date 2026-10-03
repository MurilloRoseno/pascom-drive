import { useState } from 'react';
import PropTypes from 'prop-types';
import { diaPorExtenso } from '../../lib/datas.js';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, Segmentado,
} from '../ui.jsx';

const RECORRENCIAS = [
  { valor: 'nenhuma', rotulo: 'Não repete' },
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'mensal', rotulo: 'Todo mês' },
];

const VAZIO = {
  titulo: '', hora: '', horaFim: '', local: '', tipo: 'missa', recorrencia: 'nenhuma', ate: '', descricao: '',
};

const doCompromisso = (c) => ({
  titulo: c.titulo, hora: c.hora, horaFim: c.horaFim, local: c.local, tipo: c.tipo,
  recorrencia: c.recorrencia, ate: c.ate, descricao: c.descricao,
});

/**
 * Cria ou edita um compromisso. Se o envio falhar, o que foi digitado continua na
 * tela (só limpa quando dá certo). Use `key` para reiniciar ao trocar de dia/item.
 * @param {{
 *   data: string, compromisso?: object, tipos: {id: string, nome: string}[], podeSalvar: boolean,
 *   onEnviar: (dados: object) => Promise<void>, onCancelar?: () => void
 * }} props
 */
export default function FormularioCompromisso({ data, compromisso, tipos, podeSalvar, onEnviar, onCancelar }) {
  const [f, setF] = useState(() => (compromisso ? doCompromisso(compromisso) : VAZIO));
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const editando = Boolean(compromisso);
  const dataDoItem = compromisso ? compromisso.data : data;

  const mudar = (campo) => (e) => { setF((x) => ({ ...x, [campo]: e.target.value })); setErro(''); };

  async function enviar(ev) {
    ev.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await onEnviar({ ...f, data: dataDoItem });
      if (!editando) setF(VAZIO);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const titulo = editando ? `Editar compromisso` : `Novo compromisso em ${data ? diaPorExtenso(data) : '…'}`;

  return (
    <Cartao titulo={titulo} destaque={editando}>
      {!data && !editando ? (
        <Aviso tom="info">Escolha um dia no calendário para adicionar um compromisso.</Aviso>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-4">
          <Campo rotulo="Título" htmlFor="ag-titulo">
            <input id="ag-titulo" className={CLASSE_INPUT} maxLength={120} placeholder="Ex.: Celebração da Profissão de Fé" value={f.titulo} disabled={!podeSalvar} onChange={mudar('titulo')} />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Início (vazio = dia inteiro)" htmlFor="ag-hora">
              <input id="ag-hora" type="time" className={CLASSE_INPUT} value={f.hora} disabled={!podeSalvar} onChange={mudar('hora')} />
            </Campo>
            <Campo rotulo="Término (opcional)" htmlFor="ag-hora-fim">
              <input id="ag-hora-fim" type="time" className={CLASSE_INPUT} value={f.horaFim} disabled={!podeSalvar || !f.hora} onChange={mudar('horaFim')} />
            </Campo>
          </div>

          <Campo rotulo="Local" htmlFor="ag-local">
            <input id="ag-local" className={CLASSE_INPUT} maxLength={120} placeholder="Matriz, salão, capela…" value={f.local} disabled={!podeSalvar} onChange={mudar('local')} />
          </Campo>

          <div>
            <p className="text-body-sm font-semibold">Tipo</p>
            <div className="mt-1">
              <Segmentado rotulo="Tipo" desabilitado={!podeSalvar} valor={f.tipo} onChange={(v) => { setF((x) => ({ ...x, tipo: v })); setErro(''); }} opcoes={tipos.map((t) => ({ valor: t.id, rotulo: t.nome }))} />
            </div>
          </div>

          <div>
            <p className="text-body-sm font-semibold">Repete</p>
            <div className="mt-1">
              <Segmentado rotulo="Repetição" desabilitado={!podeSalvar} valor={f.recorrencia} onChange={(v) => { setF((x) => ({ ...x, recorrencia: v })); setErro(''); }} opcoes={RECORRENCIAS} />
            </div>
            {f.recorrencia !== 'nenhuma' && (
              <div className="mt-3 max-w-xs">
                <Campo rotulo="Repete até (opcional)" htmlFor="ag-ate" ajuda="Vazio = sem data para parar.">
                  <input id="ag-ate" type="date" className={CLASSE_INPUT} value={f.ate} disabled={!podeSalvar} onChange={mudar('ate')} />
                </Campo>
              </div>
            )}
          </div>

          <Campo rotulo="Descrição (aparece no site)" htmlFor="ag-descricao">
            <textarea id="ag-descricao" className={`${CLASSE_INPUT} min-h-[80px] py-2`} maxLength={500} value={f.descricao} disabled={!podeSalvar} onChange={mudar('descricao')} />
          </Campo>

          {erro && <p role="alert" className="text-body-sm font-semibold text-painel-perigo">{erro}</p>}

          {podeSalvar && (
            <div className="flex flex-wrap gap-3">
              <Botao type="submit" variante="dourado" disabled={enviando}>{editando ? 'Salvar alterações' : 'Adicionar à agenda'}</Botao>
              {editando && onCancelar && <Botao variante="secundario" onClick={onCancelar}>Cancelar edição</Botao>}
            </div>
          )}
        </form>
      )}
    </Cartao>
  );
}

FormularioCompromisso.propTypes = {
  data: PropTypes.string,
  compromisso: PropTypes.object,
  tipos: PropTypes.array.isRequired,
  podeSalvar: PropTypes.bool.isRequired,
  onEnviar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func,
};
