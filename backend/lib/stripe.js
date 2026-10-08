const Stripe = require('stripe');

const METHOD_TYPES = { pix: 'pix', credit_card: 'card' };

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
    payment_method_types: [METHOD_TYPES[paymentMethod]],
    line_items: lineItems({ items, pricing }),
    client_reference_id: pedidoId,
    customer_email: buyer.email,
    success_url: `${publicUrl}/pagamento/sucesso?pedido=${pedidoId}`,
    cancel_url: `${publicUrl}/pagamento/falha?pedido=${pedidoId}`,
    metadata: { pedido_id: pedidoId, payment_method_selected: paymentMethod },
  }, { idempotencyKey: pedidoId });
  return { id: String(session.id), checkoutUrl: session.url };
}

function construirEventoWebhook({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return null;
  try {
    return Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (_error) {
    return null;
  }
}

module.exports = { criarPreferencia, construirEventoWebhook, lineItems };
