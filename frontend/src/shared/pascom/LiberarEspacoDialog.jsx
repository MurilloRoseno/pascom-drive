/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react';
import { pascomEstimarLiberacao, pascomEventoAcao } from '../../lib/api.js';

const bytesFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function formatBytes(bytes) {
  const valor = Number(bytes) || 0;
  if (valor >= 1024 ** 3) return `${bytesFormat.format(valor / 1024 ** 3)} GB`;
  if (valor >= 1024 ** 2) return `${bytesFormat.format(valor / 1024 ** 2)} MB`;
  if (valor >= 1024) return `${bytesFormat.format(valor / 1024)} KB`;
  return `${valor} bytes`;
}

function normalizar(texto) {
  return String(texto || '').trim().toLocaleLowerCase('pt-BR');
}

/**
 * Libera espaco de um evento arquivado: estimativa primeiro, confirmacao digitando o nome,
 * depois a acao `liberarEspaco`. Quando o Apps Script fica sem tempo, oferece "Continuar".
 */
export default function LiberarEspacoDialog({ getToken, evento, onClose, onDone }) {
  const [estimativa, setEstimativa] = useState(null);
  const [erro, setErro] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const estimar = useCallback(async () => {
    setErro('');
    try {
      setEstimativa(await pascomEstimarLiberacao(await getToken(), evento.eventoId));
    } catch (cause) {
      setErro(cause.message);
    }
  }, [getToken, evento.eventoId]);

  useEffect(() => { estimar(); }, [estimar]);

  useEffect(() => {
    const fechar = (event) => { if (event.key === 'Escape' && !executando) onClose(); };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [executando, onClose]);

  const liberar = async () => {
    setExecutando(true);
    setErro('');
    try {
      const resposta = await pascomEventoAcao(await getToken(), evento.eventoId, { acao: 'liberarEspaco' });
      const total = (resultado?.bytesLiberados || 0) + (resposta.liberacao?.bytesLiberados || 0);
      setResultado({ ...resposta.liberacao, bytesLiberados: total });
      onDone?.(resposta);
    } catch (cause) {
      setErro(cause.message);
    } finally {
      setExecutando(false);
    }
  };

  const bloqueadoPorPedido = estimativa?.pedidosPendentes > 0;
  const nadaASair = estimativa && estimativa.arquivos === 0;
  const nomeConfere = normalizar(confirmacao) === normalizar(evento.title);
  const parcial = resultado?.situacao === 'parcial';

  return (
    <div className="pascom-dialog-backdrop">
      <div className="pascom-dialog pascom-release-dialog" role="dialog" aria-modal="true" aria-labelledby="pascom-release-title">
        <span className="pascom-eyebrow">Liberar espaço no Drive</span>
        <h2 id="pascom-release-title">{evento.title}</h2>

        {erro && <div className="pascom-alert" role="alert">{erro}</div>}
        {!estimativa && !erro && <p role="status">Calculando o que pode sair…</p>}

        {resultado && (
          <div className={`pascom-alert ${parcial ? 'pascom-alert-warn' : 'success'}`} role="status">
            {parcial
              ? `Parte dos arquivos já foi para a lixeira (${formatBytes(resultado.bytesLiberados)}). O tempo do Apps Script acabou; continue para terminar.`
              : `Pronto: ${formatBytes(resultado.bytesLiberados)} foram para a lixeira do Drive.`}
          </div>
        )}

        {estimativa && !resultado && (
          <>
            <dl className="pascom-release-summary">
              <div><dt>Vai para a lixeira</dt><dd>{formatBytes(estimativa.bytesLiberados)} <small>{estimativa.arquivos} arquivos</small></dd></div>
              <div><dt>Continua guardado</dt><dd>{estimativa.originaisMantidos} {estimativa.originaisMantidos === 1 ? 'original vendido' : 'originais vendidos'} <small>{formatBytes(estimativa.bytesMantidos)}</small></dd></div>
            </dl>
            <p>
              Saem as prévias e miniaturas de todas as fotos e os originais das fotos que ninguém comprou.
              Quem já comprou continua conseguindo baixar. O evento não poderá voltar a ser publicado nem vendido.
            </p>
            <p className="pascom-upload-hint">
              A lixeira do Drive guarda os arquivos por 30 dias: o espaço volta depois disso, ou na hora se alguém esvaziar a lixeira.
            </p>
            {bloqueadoPorPedido && (
              <div className="pascom-alert pascom-alert-warn">
                Há {estimativa.pedidosPendentes} pedido(s) deste evento aguardando pagamento. Espere 48 horas para liberar.
              </div>
            )}
            {nadaASair && <p className="pascom-empty">Não há mais nada deste evento para liberar.</p>}
            {!bloqueadoPorPedido && !nadaASair && (
              <label className="pascom-release-confirm">
                Para confirmar, digite o nome do evento
                <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" placeholder={evento.title} />
              </label>
            )}
          </>
        )}

        <div className="pascom-user-actions">
          {!resultado && estimativa && !bloqueadoPorPedido && !nadaASair && (
            <button type="button" className="pascom-danger" disabled={!nomeConfere || executando} onClick={liberar}>
              {executando ? 'Liberando…' : 'Mandar para a lixeira'}
            </button>
          )}
          {parcial && (
            <button type="button" className="pascom-primary" disabled={executando} onClick={liberar}>
              {executando ? 'Liberando…' : 'Continuar'}
            </button>
          )}
          <button type="button" className="pascom-secondary" disabled={executando} onClick={onClose}>
            {parcial ? 'Depois' : resultado ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
