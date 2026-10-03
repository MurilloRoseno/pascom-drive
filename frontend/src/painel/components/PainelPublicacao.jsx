import { useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, Segmentado, useToast,
} from '../ui.jsx';
import { PRAZOS, formatarDataHora, opcaoDoPrazo, resumoPublicacao } from '../publicacaoUi.js';

function hojeLocal() {
  const d = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

function estadoInicial(evento, prazoPadrao) {
  const agendado = evento.estado === 'agendado' && evento.publicarEm;
  const prazoDias = evento.estado === 'rascunho' ? prazoPadrao : evento.prazoDias;
  return {
    modo: agendado ? 'agendar' : 'agora',
    data: agendado ? evento.publicarEm.slice(0, 10) : '',
    hora: agendado ? evento.publicarEm.slice(11, 16) : '08:00',
    prazoOpcao: opcaoDoPrazo(prazoDias),
    prazoCustom: [3, 7, 0].includes(prazoDias) ? '' : String(prazoDias),
  };
}

/**
 * Formulário "Publicação do evento". O navegador só escolhe modo, dia, hora e
 * prazo; o servidor monta as datas e valida (inclusive "nada no passado").
 * Use `key={evento.eventoId}` para reiniciar ao trocar de evento.
 */
export default function PainelPublicacao({ evento, prazoPadrao, categorias, podeEditar, onSalvo }) {
  const { chamar } = usePainel();
  const avisar = useToast();
  const [f, setF] = useState(() => estadoInicial(evento, prazoPadrao));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo) => (valor) => { setF((atual) => ({ ...atual, [campo]: valor })); setErro(''); };

  const prazoDias = f.prazoOpcao === 'custom' ? Number(f.prazoCustom) : f.prazoOpcao;
  const resumo = resumoPublicacao({ modo: f.modo, data: f.data, hora: f.hora, prazoDias: prazoDias || 0 });

  async function enviar(corpo, mensagemOk) {
    setSalvando(true);
    setErro('');
    try {
      const atualizado = await chamar(`/api/pascom/eventos/${encodeURIComponent(evento.eventoId)}/publicacao`, { method: 'PUT', body: corpo });
      avisar(mensagemOk(atualizado));
      onSalvo(atualizado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  function publicar() {
    if (f.prazoOpcao === 'custom' && !(Number.isInteger(prazoDias) && prazoDias >= 1 && prazoDias <= 365)) {
      setErro('Informe um prazo de 1 a 365 dias.');
      return;
    }
    if (f.modo === 'agendar' && !f.data) {
      setErro('Escolha o dia da publicação.');
      return;
    }
    const corpo = f.modo === 'agendar'
      ? { modo: 'agendar', data: f.data, hora: f.hora, prazoDias }
      : { modo: 'agora', prazoDias };
    enviar(corpo, (e) => (f.modo === 'agendar'
      ? `Publicação agendada para ${formatarDataHora(e.publicarEm)}.`
      : 'Evento publicado agora.'));
  }

  async function mudarCategoria(slug) {
    try {
      onSalvo(await chamar(`/api/pascom/eventos/${encodeURIComponent(evento.eventoId)}/categoria`, { method: 'PUT', body: { categoria: slug } }));
      avisar('Categoria atualizada.');
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <Cartao titulo={`Publicação: ${evento.nome}`} destaque>
      <div className="space-y-5">
        {categorias.length > 0 && (
          <Campo rotulo="Categoria" htmlFor="categoria-evento">
            <select
              id="categoria-evento"
              className={CLASSE_INPUT}
              value={evento.categoria}
              disabled={!podeEditar}
              onChange={(e) => mudarCategoria(e.target.value)}
            >
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
        )}

        <div>
          <p className="text-body-sm font-semibold">Quando entra no ar</p>
          <div className="mt-2">
            <Segmentado
              rotulo="Quando entra no ar"
              desabilitado={!podeEditar}
              valor={f.modo}
              onChange={mudar('modo')}
              opcoes={[{ valor: 'agora', rotulo: 'Publicar agora' }, { valor: 'agendar', rotulo: 'Agendar' }]}
            />
          </div>
          {f.modo === 'agendar' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Dia da publicação" htmlFor="pub-data">
                <input id="pub-data" type="date" className={CLASSE_INPUT} min={hojeLocal()} value={f.data} disabled={!podeEditar} onChange={(e) => mudar('data')(e.target.value)} />
              </Campo>
              <Campo rotulo="Horário" htmlFor="pub-hora">
                <input id="pub-hora" type="time" className={CLASSE_INPUT} value={f.hora} disabled={!podeEditar} onChange={(e) => mudar('hora')(e.target.value)} />
              </Campo>
            </div>
          )}
        </div>

        <div>
          <p className="text-body-sm font-semibold">Por quanto tempo fica publicado</p>
          <div className="mt-2">
            <Segmentado
              rotulo="Prazo de permanência"
              desabilitado={!podeEditar}
              valor={f.prazoOpcao}
              onChange={mudar('prazoOpcao')}
              opcoes={PRAZOS.map((p) => ({ ...p, rotulo: p.valor === prazoPadrao ? `${p.rotulo} · padrão` : p.rotulo }))}
            />
          </div>
          {f.prazoOpcao === 'custom' && (
            <div className="mt-3 max-w-[220px]">
              <Campo rotulo="Quantos dias" htmlFor="pub-prazo">
                <input id="pub-prazo" type="number" min="1" max="365" inputMode="numeric" className={CLASSE_INPUT} value={f.prazoCustom} disabled={!podeEditar} onChange={(e) => mudar('prazoCustom')(e.target.value)} />
              </Campo>
            </div>
          )}
        </div>

        <dl className="grid gap-2 rounded-[10px] bg-painel-cabecalho p-4 text-body-sm sm:grid-cols-2">
          <div><dt className="font-mono text-caption uppercase text-painel-texto2">Entra no ar</dt><dd className="font-semibold">{resumo.entra}</dd></div>
          <div><dt className="font-mono text-caption uppercase text-painel-texto2">Sai do ar</dt><dd className="font-semibold">{resumo.sai}</dd></div>
        </dl>

        <Aviso tom="info">
          Ao vencer o prazo, o evento vai para Arquivado: some da busca e das vendas e continua no painel.
          Pedidos já pagos seguem com o download liberado.
        </Aviso>

        {erro && <p role="alert" className="text-body-sm font-semibold text-painel-perigo">{erro}</p>}

        {podeEditar && (
          <div className="flex flex-wrap gap-3">
            <Botao variante="dourado" disabled={salvando} onClick={publicar}>
              {f.modo === 'agendar' ? 'Salvar agendamento' : 'Publicar agora'}
            </Botao>
            <Botao variante="secundario" disabled={salvando} onClick={() => enviar({ modo: 'rascunho', prazoDias: prazoDias || 0 }, () => 'Evento voltou a rascunho.')}>
              Voltar a rascunho
            </Botao>
          </div>
        )}
      </div>
    </Cartao>
  );
}
