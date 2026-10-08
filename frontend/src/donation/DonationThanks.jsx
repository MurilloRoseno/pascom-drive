import { useEffect, useState } from 'react';
import DonationHeader from './DonationHeader.jsx';
import Icon from './icons.jsx';
import { PARISH } from './donation-content.js';
import { brl } from './donation-math.js';
import { statusDoacao } from '../lib/api.js';

const MAX_TRIES = 8;
const RETRY_MS = 2500;

// O webhook do Stripe pode chegar alguns segundos depois do retorno do doador.
function useDonationStatus(doacaoId) {
  const [state, setState] = useState({ loading: Boolean(doacaoId), doacao: null, error: '' });
  useEffect(() => {
    if (!doacaoId) return undefined;
    let alive = true;
    let timer;
    let tries = 0;
    const load = () => {
      tries += 1;
      statusDoacao(doacaoId)
        .then((doacao) => {
          if (!alive) return;
          setState({ loading: false, doacao, error: '' });
          if (!doacao.confirmed && doacao.status === 'Pendente' && tries < MAX_TRIES) timer = setTimeout(load, RETRY_MS);
        })
        .catch((error) => alive && setState({ loading: false, doacao: null, error: error.message }));
    };
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, [doacaoId]);
  return state;
}

export default function DonationThanks() {
  const doacaoId = new URLSearchParams(window.location.search).get('doacao') || '';
  const { loading, doacao } = useDonationStatus(doacaoId);
  const confirmed = Boolean(doacao && doacao.confirmed);
  const monthly = Boolean(doacao && doacao.frequency === 'mensal');

  return (
    <div className="doar doar-simple">
      <DonationHeader onPaper />
      <main className="doar-panel" aria-live="polite">
        {loading && <p className="doar-lede">Conferindo sua oferta...</p>}

        {!loading && confirmed && (
          <>
            <span className="doar-badge is-ok"><Icon name="check" size={18} /> Oferta recebida</span>
            <h1>Deus lhe pague.</h1>
            <p className="doar-lede">Sua oferta ajuda a sustentar a vida e a missão da {PARISH.name}. O comprovante foi enviado para o seu e-mail.</p>
          </>
        )}

        {!loading && doacao && !confirmed && (
          <>
            <span className="doar-badge"><Icon name="clock" size={18} /> Aguardando confirmação</span>
            <h1>Estamos confirmando seu pagamento.</h1>
            <p className="doar-lede">
              {doacao.status === 'Pendente'
                ? 'Isso costuma levar poucos instantes. No Pix, a confirmação chega assim que o pagamento é feito. Você receberá o comprovante por e-mail.'
                : 'O pagamento não foi concluído. Nenhum valor foi cobrado. Você pode tentar de novo quando quiser.'}
            </p>
          </>
        )}

        {!loading && !doacao && (
          <>
            <h1>Não encontramos esta oferta.</h1>
            <p className="doar-lede">Confira o link recebido ou fale com a secretaria paroquial.</p>
          </>
        )}

        {doacao && (
          <dl className="doar-receipt">
            <div><dt>Código</dt><dd className="doar-code">{doacao.id}</dd></div>
            <div><dt>Destino</dt><dd>{doacao.destino}</dd></div>
            <div><dt>Frequência</dt><dd>{monthly ? 'Todo mês' : 'Uma vez'}</dd></div>
            <div><dt>Oferta</dt><dd>{brl(doacao.amount)}</dd></div>
            {doacao.fee > 0 && <div><dt>Taxa do pagamento coberta por você</dt><dd>{brl(doacao.fee)}</dd></div>}
            <div className="is-total"><dt>Total</dt><dd>{brl(doacao.total)}</dd></div>
          </dl>
        )}

        {confirmed && monthly && (
          <p className="doar-hint">A mesma oferta se repete todo mês no cartão. Para cancelar, use o botão &quot;Gerenciar doação mensal&quot; do e-mail de comprovante.</p>
        )}

        <div className="doar-panel-actions">
          <a className="doar-button" href="/doar">{confirmed ? 'Fazer outra oferta' : 'Voltar à página de doação'}</a>
          <a className="doar-link" href="/">Ir para o site da paróquia</a>
        </div>
        <p className="doar-hint">Dúvidas? Fale com a secretaria: <a href={PARISH.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp {PARISH.whatsappLabel}</a>.</p>
      </main>
    </div>
  );
}
