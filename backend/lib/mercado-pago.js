const crypto = require('crypto');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

function client() {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error('Mercado Pago nao configurado.');
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN, options: { timeout: 10000 } });
}

function paymentMethods(method) {
  const common = { installments: 1, default_installments: 1 };
  if (method === 'pix') {
    return { ...common, excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }] };
  }
  return { ...common, excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'ticket' }] };
}

async function criarPreferencia({ pedidoId, buyer, items, pricing, paymentMethod }) {
  const preference = new Preference(client());
  const publicUrl = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
  const hasDiscount = Number(pricing.discountTotal || 0) > 0;
  const commercialItems = hasDiscount
    ? [{
      id: 'fotos-selecionadas',
      title: `${items.length} foto${items.length === 1 ? '' : 's'} selecionada${items.length === 1 ? '' : 's'}`,
      quantity: 1,
      unit_price: pricing.discountedSubtotal,
      currency_id: 'BRL',
    }]
    : items.map((item) => ({
      id: item.foto.id,
      title: `Foto - ${item.evento.title}`,
      quantity: 1,
      unit_price: item.foto.price,
      currency_id: 'BRL',
    }));
  const body = {
    items: [
      ...commercialItems,
      { id: 'taxa-servico', title: 'Taxa de servico', quantity: 1, unit_price: pricing.serviceFee, currency_id: 'BRL' },
      { id: 'taxa-comodidade', title: 'Taxa de comodidade', quantity: 1, unit_price: pricing.convenienceFee, currency_id: 'BRL' },
      { id: 'custo-pagamento', title: 'Custo estimado do pagamento', quantity: 1, unit_price: pricing.paymentCost, currency_id: 'BRL' },
    ].filter((item) => item.unit_price > 0),
    external_reference: pedidoId,
    payer: { name: buyer.name, email: buyer.email, phone: { number: buyer.whatsapp } },
    payment_methods: paymentMethods(paymentMethod),
    back_urls: {
      success: `${publicUrl}/pagamento/sucesso?pedido=${pedidoId}`,
      pending: `${publicUrl}/pagamento/pendente?pedido=${pedidoId}`,
      failure: `${publicUrl}/pagamento/falha?pedido=${pedidoId}`,
    },
    auto_return: 'approved',
    notification_url: `${publicUrl}/api/webhook/mercado-pago`,
    statement_descriptor: 'SAO RAFAEL FOTOS',
    metadata: { pedido_id: pedidoId, payment_method_selected: paymentMethod },
  };
  const result = await preference.create({
    body,
    requestOptions: { idempotencyKey: pedidoId },
  });
  return {
    id: String(result.id),
    checkoutUrl: process.env.MP_USE_SANDBOX === 'true' ? result.sandbox_init_point : result.init_point,
  };
}

async function consultarPagamento(paymentId) {
  const result = await new Payment(client()).get({ id: paymentId });
  return result;
}

function validarAssinaturaWebhook({ dataId, requestId, signature, secret }) {
  if (!dataId || !requestId || !signature || !secret) return false;
  const fields = Object.fromEntries(String(signature).split(',').map((part) => {
    const [key, value] = part.split('=');
    return [key && key.trim(), value && value.trim()];
  }));
  if (!fields.ts || !fields.v1) return false;
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${fields.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(fields.v1));
  } catch (_error) {
    return false;
  }
}

module.exports = { criarPreferencia, consultarPagamento, validarAssinaturaWebhook, paymentMethods };
