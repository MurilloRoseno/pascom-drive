import { useEffect, useId, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from './icons.jsx';
import { DESTINOS } from './donation-content.js';
import { amountError, brl, parseAmount, resumoDoacao } from './donation-math.js';
import { criarDoacao } from '../lib/api.js';

const STORAGE_KEY = 'doar:form';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREQUENCIES = [{ id: 'unica', label: 'Uma vez' }, { id: 'mensal', label: 'Todo mês' }];
const METHODS = [{ id: 'pix', label: 'Pix' }, { id: 'credit_card', label: 'Cartão' }];

function initialState(config) {
  const base = {
    destino: config.destinos[0].id,
    preset: config.valoresSugeridos[1] ?? config.valoresSugeridos[0],
    custom: '',
    frequency: 'unica',
    method: 'pix',
    coverFees: false,
    name: '',
    email: '',
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    sessionStorage.removeItem(STORAGE_KEY);
    if (saved && config.destinos.some((destino) => destino.id === saved.destino)) return { ...base, ...saved };
  } catch (_error) {
    // Sem armazenamento disponivel: comeca do padrao.
  }
  return base;
}

export default function DonationForm({ config, canceled = false, onSummaryChange }) {
  const uid = useId();
  const [form, setForm] = useState(() => initialState(config));
  const [touched, setTouched] = useState({ amount: false, email: false });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const monthly = form.frequency === 'mensal';
  const method = monthly ? 'credit_card' : form.method;
  const amount = form.custom ? parseAmount(form.custom) : form.preset;
  const amountProblem = amountError(amount, config.limites);
  const emailProblem = form.email && !EMAIL_PATTERN.test(form.email.trim()) ? 'Confira o e-mail informado.' : '';
  const resumo = useMemo(
    () => resumoDoacao({ amount, method, coverFees: form.coverFees, tarifas: config.tarifas }),
    [amount, method, form.coverFees, config.tarifas],
  );
  const feePreview = resumoDoacao({ amount, method, coverFees: true, tarifas: config.tarifas }).fee;
  const valid = !amountProblem && !emailProblem;
  const destinoLabel = (config.destinos.find((destino) => destino.id === form.destino) || {}).label || '';

  useEffect(() => {
    if (onSummaryChange) onSummaryChange({ total: resumo.total, valid, monthly });
  }, [onSummaryChange, resumo.total, valid, monthly]);

  async function submit(event) {
    event.preventDefault();
    setTouched({ amount: true, email: true });
    if (!valid || submitting) return;
    setSubmitting(true);
    setServerError('');
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (_error) {
      // Seguir sem salvar o rascunho.
    }
    try {
      const response = await criarDoacao({
        amount: resumo.amount,
        destino: form.destino,
        frequency: form.frequency,
        method,
        coverFees: Boolean(form.coverFees && config.tarifas),
        name: form.name.trim(),
        email: form.email.trim(),
      });
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setServerError(error.message || 'Não foi possível iniciar a doação. Tente novamente.');
      setSubmitting(false);
    }
  }

  const showAmountError = touched.amount && amountProblem;
  const showEmailError = touched.email && emailProblem;

  return (
    <form className="doar-form" id="doar-form" onSubmit={submit} noValidate aria-labelledby={`${uid}-title`}>
      <h2 className="doar-form-title" id={`${uid}-title`}>Faça sua oferta</h2>
      {canceled && (
        <p className="doar-notice" role="status">O pagamento não foi concluído. Suas escolhas continuam aqui.</p>
      )}

      <fieldset className="doar-field">
        <legend>Para onde vai</legend>
        <div className="doar-tiles">
          {config.destinos.map((destino) => (
            <label className="doar-tile" key={destino.id}>
              <input
                type="radio"
                name={`${uid}-destino`}
                checked={form.destino === destino.id}
                onChange={() => set({ destino: destino.id })}
              />
              <span className="doar-tile-body">
                <strong>{destino.label}</strong>
                <small>{(DESTINOS[destino.id] || {}).hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="doar-field">
        <legend>Valor</legend>
        <div className="doar-amounts">
          {config.valoresSugeridos.map((value) => (
            <label className="doar-chip" key={value}>
              <input
                type="radio"
                name={`${uid}-valor`}
                checked={!form.custom && form.preset === value}
                onChange={() => set({ preset: value, custom: '' })}
              />
              <span>{`R$ ${value}`}</span>
            </label>
          ))}
        </div>
        <label className="doar-custom" htmlFor={`${uid}-custom`}>
          <span className="doar-custom-label">Outro valor</span>
          <span className="doar-custom-box">
            <span aria-hidden="true">R$</span>
            <input
              id={`${uid}-custom`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Outro valor"
              value={form.custom}
              aria-invalid={showAmountError ? 'true' : undefined}
              aria-describedby={showAmountError ? `${uid}-amount-error` : undefined}
              onChange={(event) => set({ custom: event.target.value.replace(/[^\d.,]/g, '') })}
              onBlur={() => setTouched((current) => ({ ...current, amount: true }))}
            />
          </span>
        </label>
        {showAmountError && <p className="doar-error" id={`${uid}-amount-error`} role="alert">{amountProblem}</p>}
      </fieldset>

      <div className="doar-pair">
        <fieldset className="doar-field">
          <legend>Frequência</legend>
          <div className="doar-segment">
            {FREQUENCIES.map((option) => (
              <label key={option.id}>
                <input
                  type="radio"
                  name={`${uid}-frequencia`}
                  checked={form.frequency === option.id}
                  onChange={() => set({ frequency: option.id })}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="doar-field">
          <legend>Forma de pagamento</legend>
          <div className="doar-segment">
            {METHODS.map((option) => (
              <label key={option.id}>
                <input
                  type="radio"
                  name={`${uid}-meio`}
                  checked={method === option.id}
                  disabled={monthly && option.id === 'pix'}
                  onChange={() => set({ method: option.id })}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {monthly && <p className="doar-hint">A doação mensal é feita no cartão. Você cancela quando quiser.</p>}
      </div>

      {config.tarifas && (
        <label className="doar-check">
          <input type="checkbox" checked={form.coverFees} onChange={(event) => set({ coverFees: event.target.checked })} />
          <span>
            <strong>{`Quero cobrir a taxa do pagamento (+ ${brl(feePreview)})`}</strong>
            <small>Assim o valor da oferta chega inteiro à paróquia.</small>
          </span>
        </label>
      )}

      <details className="doar-identify">
        <summary>Quero me identificar <span>(opcional)</span><Icon name="chevron" size={18} /></summary>
        <div className="doar-identify-body">
          <label htmlFor={`${uid}-name`}>Seu nome</label>
          <input id={`${uid}-name`} autoComplete="name" maxLength={120} value={form.name} onChange={(event) => set({ name: event.target.value })} />
          <label htmlFor={`${uid}-email`}>E-mail para o comprovante</label>
          <input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            maxLength={160}
            value={form.email}
            aria-invalid={showEmailError ? 'true' : undefined}
            aria-describedby={showEmailError ? `${uid}-email-error` : undefined}
            onChange={(event) => set({ email: event.target.value })}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          />
          {showEmailError && <p className="doar-error" id={`${uid}-email-error`} role="alert">{emailProblem}</p>}
        </div>
      </details>

      <div className="doar-summary" aria-live="polite">
        <span>{[destinoLabel, monthly ? 'todo mês' : 'uma vez', method === 'pix' ? 'Pix' : 'cartão'].join(' · ')}</span>
        <strong>{brl(resumo.total)}</strong>
      </div>
      {resumo.fee > 0 && <p className="doar-hint">{`Oferta de ${brl(resumo.amount)} mais ${brl(resumo.fee)} de taxa do pagamento.`}</p>}

      {serverError && <p className="doar-error doar-error-box" role="alert">{serverError}</p>}

      <button className="doar-cta" type="submit" disabled={submitting} aria-busy={submitting ? 'true' : undefined}>
        <span>{submitting ? 'Abrindo o Stripe...' : `Doar ${brl(resumo.total)}${monthly ? ' por mês' : ''}`}</span>
        <span className="doar-cta-icon"><Icon name="arrow" size={18} /></span>
      </button>
      <p className="doar-safe"><Icon name="lock" size={16} /> Pagamento no ambiente seguro do Stripe. Não guardamos dados do seu cartão.</p>
    </form>
  );
}

DonationForm.propTypes = {
  config: PropTypes.shape({
    destinos: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired, label: PropTypes.string.isRequired })).isRequired,
    valoresSugeridos: PropTypes.arrayOf(PropTypes.number).isRequired,
    limites: PropTypes.shape({ min: PropTypes.number.isRequired, max: PropTypes.number.isRequired }).isRequired,
    tarifas: PropTypes.object,
  }).isRequired,
  canceled: PropTypes.bool,
  onSummaryChange: PropTypes.func,
};
