const Stripe = require('stripe');

// A API atual do Stripe nao aceita mais payment_method_types na sessao: os meios
// vem do Dashboard e aqui excluimos os que o comprador nao escolheu.
const EXCLUDED_METHOD_TYPES = { pix: ['card', 'boleto'], credit_card: ['pix', 'boleto'] };

function client() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe nao configurado.');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 10000 });
}

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

function lineItem(name, amount) {
  return {
    quantity: 1,
    price_data: { currency: 'brl', unit_amount: cents(amount), product_data: { name } },
  };
}

function lineItems({ items, pricing }) {
  const hasDiscount = Number(pricing.discountTotal || 0) > 0;
  const commercialItems = hasDiscount
    ? [lineItem(
      `${items.length} foto${items.length === 1 ? '' : 's'} selecionada${items.length === 1 ? '' : 's'}`,
      pricing.discountedSubtotal
    )]
    : items.map((item) => lineItem(`Foto - ${item.evento.title}`, item.foto.price));
  return [
    ...commercialItems,
    lineItem('Taxa de servico', pricing.serviceFee),
    lineItem('Taxa de comodidade', pricing.convenienceFee),
  ].filter((item) => item.price_data.unit_amount > 0);
}

async function criarPreferencia({ pedidoId, buyer, items, pricing, paymentMethod }) {
  const publicUrl = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
  const session = await client().checkout.sessions.create({
    mode: 'payment',
    excluded_payment_method_types: EXCLUDED_METHOD_TYPES[paymentMethod],
    line_items: lineItems({ items, pricing }),
    client_reference_id: pedidoId,
    customer_email: buyer.email,
    success_url: `${publicUrl}/pagamento/sucesso?pedido=${pedidoId}`,
    cancel_url: `${publicUrl}/pagamento/falha?pedido=${pedidoId}`,
    metadata: { pedido_id: pedidoId, payment_method_selected: paymentMethod },
  }, { idempotencyKey: pedidoId });
  return { id: String(session.id), checkoutUrl: session.url };
}

// Doacao: "Doar" no botao do Stripe; mensal vira assinatura (somente cartao).
async function criarSessaoDoacao({ doacaoId, destino, frequency, method, resumo, email }) {
  const publicUrl = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
  const mensal = frequency === 'mensal';
  const metadata = {
    tipo: 'doacao',
    doacao_id: doacaoId,
    destino: destino.id,
    frequencia: frequency,
    valor: String(resumo.amount),
    taxa: String(resumo.fee),
  };
  const item = (name, amount) => {
    const base = lineItem(name, amount);
    if (mensal) base.price_data.recurring = { interval: 'month' };
    return base;
  };
  const params = {
    mode: mensal ? 'subscription' : 'payment',
    submit_type: 'donate',
    excluded_payment_method_types: EXCLUDED_METHOD_TYPES[mensal ? 'credit_card' : method],
    line_items: [
      item(`Doação — ${destino.label}${mensal ? ' (mensal)' : ''}`, resumo.amount),
      item('Taxa do pagamento coberta por você', resumo.fee),
    ].filter((entry) => entry.price_data.unit_amount > 0),
    client_reference_id: doacaoId,
    success_url: `${publicUrl}/doar/obrigado?doacao=${doacaoId}`,
    cancel_url: `${publicUrl}/doar?cancelada=1`,
    metadata,
  };
  if (email) params.customer_email = email;
  if (mensal) params.subscription_data = { metadata };
  const session = await client().checkout.sessions.create(params, { idempotencyKey: doacaoId });
  return { id: String(session.id), checkoutUrl: session.url };
}

async function buscarAssinatura(subscriptionId) {
  const subscription = await client().subscriptions.retrieve(subscriptionId);
  const items = (subscription.items && subscription.items.data) || [];
  const periodEnd = (items[0] && items[0].current_period_end) || subscription.current_period_end || null;
  return {
    id: subscription.id,
    status: subscription.status,
    metadata: subscription.metadata || {},
    total: items.reduce((sum, entry) => sum + Number((entry.price && entry.price.unit_amount) || 0), 0) / 100,
    nextChargeAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : '',
  };
}

async function cancelarAssinatura(subscriptionId) {
  const subscription = await client().subscriptions.cancel(subscriptionId);
  return { id: subscription.id, status: subscription.status };
}

// Link do comprovante emitido pelo proprio Stripe: recibo da cobranca (oferta
// unica) ou fatura hospedada (mensal). Sem link, o e-mail segue sem o botao.
async function buscarComprovante({ paymentIntentId = '', invoiceId = '' }) {
  try {
    if (paymentIntentId) {
      const intent = await client().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
      return String((intent.latest_charge && intent.latest_charge.receipt_url) || '');
    }
    if (invoiceId) {
      const invoice = await client().invoices.retrieve(invoiceId);
      return String(invoice.hosted_invoice_url || '');
    }
  } catch (error) {
    console.warn(JSON.stringify({ event: 'stripe_receipt_unavailable', message: error.message, ts: new Date().toISOString() }));
  }
  return '';
}

function construirEventoWebhook({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return null;
  try {
    return Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (_error) {
    return null;
  }
}

module.exports = {
  criarPreferencia, construirEventoWebhook, lineItems,
  criarSessaoDoacao, buscarAssinatura, cancelarAssinatura, buscarComprovante,
};
