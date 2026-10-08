import { useEffect, useState } from 'react';
import DonationHeader from './DonationHeader.jsx';
import Icon from './icons.jsx';
import { PARISH } from './donation-content.js';
import { brl, formatDate } from './donation-math.js';
import { assinaturaDoacao, cancelarAssinaturaDoacao } from '../lib/api.js';

export default function DonationManage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [state, setState] = useState({ loading: true, assinatura: null, error: '' });
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!token) {
      setState({ loading: false, assinatura: null, error: 'Link inválido ou expirado.' });
      return undefined;
    }
    assinaturaDoacao(token)
      .then((assinatura) => alive && setState({ loading: false, assinatura, error: '' }))
      .catch((error) => alive && setState({ loading: false, assinatura: null, error: error.message }));
    return () => { alive = false; };
  }, [token]);

  async function cancel() {
    setWorking(true);
    setActionError('');
    try {
      const assinatura = await cancelarAssinaturaDoacao(token);
      setState({ loading: false, assinatura, error: '' });
      setConfirming(false);
    } catch (error) {
      setActionError(error.message || 'Não foi possível cancelar agora. Tente novamente.');
    } finally {
      setWorking(false);
    }
  }

  const { loading, assinatura, error } = state;

  return (
    <div className="doar doar-simple">
      <DonationHeader onPaper />
      <main className="doar-panel" aria-live="polite">
        {loading && <p className="doar-lede">Carregando sua doação mensal...</p>}

        {!loading && !assinatura && (
          <>
            <h1>Não foi possível abrir esta doação.</h1>
            <p className="doar-lede">{error} Use o botão do e-mail de comprovante mais recente ou fale com a secretaria paroquial.</p>
          </>
        )}

        {assinatura && (
          <>
            <span className={`doar-badge${assinatura.active ? ' is-ok' : ''}`}>
              <Icon name={assinatura.active ? 'check' : 'clock'} size={18} /> {assinatura.active ? 'Doação mensal ativa' : 'Doação mensal cancelada'}
            </span>
            <h1>{assinatura.active ? 'Sua doação mensal' : 'Doação mensal encerrada.'}</h1>
            <p className="doar-lede">
              {assinatura.active
                ? 'Obrigado por caminhar com a paróquia todos os meses. Você pode encerrar quando quiser.'
                : 'Nenhuma nova cobrança será feita. Obrigado por tudo o que você ofertou.'}
            </p>
            <dl className="doar-receipt">
              <div><dt>Destino</dt><dd>{assinatura.destino}</dd></div>
              <div className="is-total"><dt>Valor mensal</dt><dd>{brl(assinatura.total)}</dd></div>
              {assinatura.active && assinatura.nextChargeAt && <div><dt>Próxima cobrança</dt><dd>{formatDate(assinatura.nextChargeAt)}</dd></div>}
            </dl>

            {assinatura.active && !confirming && (
              <button type="button" className="doar-button is-quiet" onClick={() => setConfirming(true)}>Cancelar doação mensal</button>
            )}
            {assinatura.active && confirming && (
              <div className="doar-confirm" role="group" aria-label="Confirmar cancelamento">
                <p>Confirma o cancelamento? Nenhuma nova cobrança será feita.</p>
                <button type="button" className="doar-button is-danger" onClick={cancel} disabled={working} aria-busy={working ? 'true' : undefined}>
                  {working ? 'Cancelando...' : 'Sim, cancelar'}
                </button>
                <button type="button" className="doar-link" onClick={() => setConfirming(false)} disabled={working}>Manter minha doação</button>
              </div>
            )}
            {actionError && <p className="doar-error doar-error-box" role="alert">{actionError}</p>}
          </>
        )}

        <div className="doar-panel-actions">
          <a className="doar-link" href="/doar">Página de doação</a>
          <a className="doar-link" href={PARISH.whatsappUrl} target="_blank" rel="noopener noreferrer">Falar com a secretaria</a>
        </div>
      </main>
    </div>
  );
}
