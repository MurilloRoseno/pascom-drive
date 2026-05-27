import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { checkoutSchema } from '../lib/validation.js';
import { cotarCheckout, criarPagamento } from '../lib/api.js';

const money = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
const methods = [
  { id: 'pix', label: 'Pix', hint: 'Confirmação rápida', detail: 'Pagamento instantâneo' },
  { id: 'credit_card', label: 'Cartão de crédito', hint: 'Crédito em 1x', detail: 'Recebimento imediato' },
];

function PaymentIcon({ method }) {
  if (method === 'pix') {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z" /><path d="m8.3 12 2.3 2.3 5-5" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.75" y="5" width="18.5" height="14" rx="2.5" /><path d="M3 9.5h18M6.5 15h4" /></svg>;
}

PaymentIcon.propTypes = { method: PropTypes.string.isRequired };

export default function CheckoutPage() {
  const { fotos, totais, removeFoto } = useCarrinho();
  const [buyer, setBuyer] = useState({ name: '', email: '', whatsapp: '' });
  const [method, setMethod] = useState('pix');
  const [pricing, setPricing] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const galleryTokens = useCallback(() => {
    return Object.fromEntries([...new Set(fotos.map((photo) => photo.eventoId))]
      .map((id) => [id, sessionStorage.getItem(`gallery:${id}`) || '']));
  }, [fotos]);

  useEffect(() => {
    setPricing(null);
    setQuoteError('');
    if (!fotos.length) return;
    cotarCheckout({ fotoIds: fotos.map((photo) => photo.id), paymentMethod: method, galleryTokens: galleryTokens() })
      .then(({ pricing: found }) => setPricing(found))
      .catch((error) => setQuoteError(error.message));
  }, [method, fotos, galleryTokens]);

  function change(field, value) {
    setBuyer((state) => ({ ...state, [field]: value }));
  }

  async function pay() {
    const valid = checkoutSchema.safeParse(buyer);
    if (!valid.success) {
      setFormError(valid.error.errors[0].message);
      return;
    }
    if (!pricing) return;
    setLoading(true);
    setFormError('');
    try {
      const response = await criarPagamento({
        ...buyer,
        fotoIds: fotos.map((photo) => photo.id),
        paymentMethod: method,
        galleryTokens: galleryTokens(),
      });
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setFormError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <Link to="/buscar">Voltar aos eventos</Link>
        <p className="hero-kicker">Compra segura</p>
        <h1>Finalizar compra</h1>
        <p>Pagamento processado no ambiente protegido do Mercado Pago.</p>
      </div>
      {!fotos.length ? (
        <div className="empty-checkout">
          <h2>Seu carrinho esta vazio</h2>
          <Link className="primary-link" to="/buscar">Encontrar fotos</Link>
        </div>
      ) : (
        <div className="checkout-columns">
          <section className="checkout-form">
            <h2>1. Suas fotos</h2>
            <div className="cart-items">
              {fotos.map((photo) => (
                <div key={photo.id} className="cart-photo">
                  <img src={photo.url} alt="" draggable="false" />
                  <div><strong>{photo.event}</strong><span>{money(photo.price)}</span></div>
                  <button type="button" onClick={() => removeFoto(photo.id)}>Remover</button>
                </div>
              ))}
            </div>
            <h2>2. Identificacao e entrega</h2>
            <label>Nome completo<input value={buyer.name} onChange={(e) => change('name', e.target.value)} /></label>
            <div className="form-pair">
              <label>E-mail<input type="email" value={buyer.email} onChange={(e) => change('email', e.target.value)} /></label>
              <label>WhatsApp<input type="tel" value={buyer.whatsapp} onChange={(e) => change('whatsapp', e.target.value.replace(/\D/g, ''))} placeholder="99982061089" /></label>
            </div>
            <p className="delivery-note">O e-mail recebe os links automaticamente. O WhatsApp sera usado pela secretaria para envio assistido.</p>
            <h2>3. Forma de pagamento</h2>
            <div className="payment-options">
              {methods.map(({ id, label, hint, detail }) => (
                <label className={`payment-option${method === id ? ' selected' : ''}`} key={id}>
                  <input type="radio" name="payment-method" checked={method === id} onChange={() => setMethod(id)} />
                  <span className="payment-check" aria-hidden="true" />
                  <span className="payment-icon"><PaymentIcon method={id} /></span>
                  <span className="payment-copy">
                    <strong>{label}</strong>
                    <small>{detail}</small>
                    <em>{hint}</em>
                  </span>
                </label>
              ))}
            </div>
          </section>
          <aside className="order-summary">
            <p className="hero-kicker">Resumo</p>
            <h2>{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</h2>
            <div className="total-row"><span>Subtotal</span><strong>{money(pricing?.subtotal ?? totais.subtotal)}</strong></div>
            <div className="total-row"><span>Taxa de servico</span><strong>{money(pricing?.serviceFee ?? totais.serviceFee)}</strong></div>
            <div className="total-row"><span>Taxa de comodidade</span><strong>{money(pricing?.convenienceFee ?? totais.convenienceFee)}</strong></div>
            <div className="total-row muted"><span>Custo estimado do pagamento</span><strong>{pricing ? money(pricing.paymentCost) : '--'}</strong></div>
            <div className="total-row final"><span>Total</span><strong>{pricing ? money(pricing.total) : '--'}</strong></div>
            {quoteError && <p className="form-error">{quoteError}</p>}
            {formError && <p className="form-error">{formError}</p>}
            <button className="payment-button" type="button" disabled={!pricing || loading} onClick={pay}>
              {loading ? 'Abrindo Mercado Pago...' : 'Pagar no Mercado Pago'}
            </button>
            <small>O custo de processamento é estimado conforme a regra administrativa ativa para o meio escolhido.</small>
          </aside>
        </div>
      )}
    </main>
  );
}
