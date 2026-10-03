import { useCallback, useEffect, useRef, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Botao, Campo, CLASSE_INPUT, Cartao, Pilula, Segmentado, useToast,
} from '../ui.jsx';
import PainelPublicacao from '../components/PainelPublicacao.jsx';
import {
  PRAZOS, opcaoDoPrazo, rotuloEstado, textoEntrada, textoSaida,
} from '../publicacaoUi.js';

function PrazoPadrao({ valor, podeEditar, onSalvar }) {
  const [opcao, setOpcao] = useState(opcaoDoPrazo(valor));
  const [custom, setCustom] = useState([3, 7, 0].includes(valor) ? '' : String(valor));
  const [erro, setErro] = useState('');

  function escolher(o) {
    setOpcao(o);
    setErro('');
    if (o !== 'custom') onSalvar(o);
  }

  function salvarCustom() {
    const n = Number(custom);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      setErro('Informe um prazo de 1 a 365 dias.');
      return;
    }
    onSalvar(n);
  }

  return (
    <Cartao
      titulo="Prazo padrão de permanência no ar"
      descricao="Vale para todo evento novo e pode ser trocado evento a evento. Quem já comprou continua baixando pelos links dentro da validade do pedido."
    >
      <Segmentado rotulo="Prazo padrão" desabilitado={!podeEditar} valor={opcao} onChange={escolher} opcoes={PRAZOS} />
      {opcao === 'custom' && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-[200px]">
            <Campo rotulo="Quantos dias" htmlFor="prazo-padrao" erro={erro}>
              <input id="prazo-padrao" type="number" min="1" max="365" inputMode="numeric" className={CLASSE_INPUT} value={custom} disabled={!podeEditar} onChange={(e) => { setCustom(e.target.value); setErro(''); }} />
            </Campo>
          </div>
          {podeEditar && <Botao onClick={salvarCustom}>Salvar prazo</Botao>}
        </div>
      )}
    </Cartao>
  );
}

export default function Eventos() {
  const { chamar, membro } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [categorias, setCategorias] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const podeEditar = membro.permissoes.includes('eventos.editar');
  const painelRef = useRef(null);

  // Ao escolher um evento, leva a tela até o painel de publicação (fica abaixo da lista).
  useEffect(() => {
    if (selecionado) painelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [selecionado]);

  const carregar = useCallback(async () => {
    setEstado({ fase: 'carregando' });
    try {
      const dados = await chamar('/api/pascom/eventos');
      setEstado({ fase: 'ok', ...dados });
      if (membro.permissoes.includes('categorias.ver')) {
        const c = await chamar('/api/pascom/categorias');
        setCategorias(c.categorias.filter((x) => x.ativo));
      }
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar, membro.permissoes]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarPrazoPadrao(dias) {
    try {
      await chamar('/api/pascom/configuracoes', { method: 'PUT', body: { chave: 'prazoPadraoDias', valor: dias } });
      setEstado((s) => ({ ...s, prazoPadraoDias: dias }));
      avisar(dias > 0 ? `Novos eventos ficam no ar por ${dias} dias.` : 'Novos eventos ficam no ar sem prazo.');
    } catch (e) {
      avisar(e.message);
    }
  }

  function atualizarEvento(atualizado) {
    setEstado((s) => ({ ...s, eventos: s.eventos.map((e) => (e.eventoId === atualizado.eventoId ? atualizado : e)) }));
  }

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando eventos…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar os eventos.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const evento = estado.eventos.find((e) => e.eventoId === selecionado);

  return (
    <div className="space-y-6">
      <PrazoPadrao key={estado.prazoPadraoDias} valor={estado.prazoPadraoDias} podeEditar={membro.permissoes.includes('eventos.editar')} onSalvar={salvarPrazoPadrao} />

      <Cartao titulo="Eventos">
        {estado.eventos.length === 0 ? (
          <p className="text-painel-texto2">Nenhum evento ainda. Eles aparecem aqui assim que as fotos forem enviadas para a pasta de entrada.</p>
        ) : (
          <ul className="divide-y divide-painel-divisor">
            {estado.eventos.map((e) => {
              const st = rotuloEstado(e);
              return (
                <li key={e.eventoId}>
                  <button
                    type="button"
                    aria-pressed={selecionado === e.eventoId}
                    onClick={() => setSelecionado(e.eventoId)}
                    className={`grid w-full min-h-[56px] items-center gap-x-4 gap-y-1 px-2 py-3 text-left sm:grid-cols-[1.6fr_.9fr_.8fr] ${selecionado === e.eventoId ? 'bg-painel-selecionado' : 'hover:bg-painel-cabecalho'}`}
                  >
                    <span>
                      <span className="block font-semibold">{e.nome}</span>
                      <span className="block text-caption text-painel-texto2">{e.categoria} · {e.totalFotos} fotos</span>
                    </span>
                    <span className="text-body-sm">
                      {textoEntrada(e)}
                      <span className="block text-caption text-painel-texto2">{textoSaida(e)}</span>
                    </span>
                    <span><Pilula tom={st.tom}>{st.rotulo}</Pilula></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <div ref={painelRef} className="scroll-mt-20 lg:scroll-mt-4">
        {evento && (
          <PainelPublicacao
            key={evento.eventoId}
            evento={evento}
            prazoPadrao={estado.prazoPadraoDias}
            categorias={categorias}
            podeEditar={podeEditar}
            onSalvo={atualizarEvento}
          />
        )}
      </div>
    </div>
  );
}
