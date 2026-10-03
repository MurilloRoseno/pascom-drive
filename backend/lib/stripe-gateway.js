const Stripe = require('stripe');

// Pagamento pela página hospedada da Stripe (Checkout): os dados do cartão nunca passam
// por este servidor. Todo valor aqui vem de `pricing`, calculado no servidor; o navegador
// só escolhe fotos e meio de pagamento.

let cliente = null;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe nao configurada.');
  if (!cliente) {
    cliente = new Stripe(process.env.STRIPE_SECRET_KEY, {
      timeout: 15000,
      maxNetworkRetries: 1,
      appInfo: { name: 'pascom-drive' },
    });
  }
  return cliente;
}

const centavos = (valor) => Math.round(Number(valor) * 100);

// Na API atual da Stripe os meios de pagamento são ligados no Dashboard (Configurações > Meios de pagamento)
// e `payment_method_types` não é mais aceito. Para cada pedido, o código só EXCLUI os meios que não
// foram escolhidos, para o comprador não pagar de cartão uma cotação feita com a tarifa do Pix.
const EXCLUIR_NO_PIX = ['card', 'boleto']; // 'link' não existe nessa lista da Stripe (a API recusa)
const EXCLUIR_NO_CARTAO = ['pix', 'boleto'];

/**
 * Linhas da cobrança, em centavos. A soma TEM de fechar com o total calculado: se não
 * fechar, nada é cobrado (melhor recusar do que cobrar um valor diferente do mostrado).
 * @returns {{price_data: object, quantity: number}[]}
 */
function montarLinhas({ items, pricing }) {
  const linha = (nome, unidade, quantidade = 1) => ({
    quantity: quantidade,
    price_data: { currency: 'brl', product_data: { name: nome }, unit_amount: unidade },
  });
  const fotos = items.length;
  const comDesconto = Number(pricing.discountTotal || 0) > 0;
  const linhas = [
    comDesconto
      ? linha(`${fotos} foto${fotos === 1 ? '' : 's'} selecionada${fotos === 1 ? '' : 's'} (com desconto)`, centavos(pricing.discountedSubtotal))
      : linha('Foto digital', centavos(pricing.unitPrice), fotos),
    linha('Taxa de serviço', centavos(pricing.serviceFee)),
    linha('Taxa de comodidade', centavos(pricing.convenienceFee)),
    linha('Custo estimado do pagamento', centavos(pricing.paymentCost)),
  ].filter((item) => item.price_data.unit_amount > 0);

  const soma = linhas.reduce((acc, item) => acc + item.price_data.unit_amount * item.quantity, 0);
  if (soma !== centavos(pricing.total)) {
    throw new Error(`Valores do pedido nao fecham com o total (${soma} x ${centavos(pricing.total)}).`);
  }
  return linhas;
}

/**
 * @param {{pedidoId: string, buyer: {email: string}, items: object[], pricing: object, paymentMethod: 'pix'|'credit_card'}} dados
 * @returns {Promise<{id: string, checkoutUrl: string}>}
 */
async function criarSessao({ pedidoId, buyer, items, pricing, paymentMethod }) {
  const publicUrl = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
  const sessao = await stripe().checkout.sessions.create({
    mode: 'payment',
    excluded_payment_method_types: paymentMethod === 'pix' ? EXCLUIR_NO_PIX : EXCLUIR_NO_CARTAO,
    line_items: montarLinhas({ items, pricing }),
    customer_email: buyer.email,
    client_reference_id: pedidoId,
    metadata: { pedido_id: pedidoId, meio: paymentMethod },
    payment_intent_data: { metadata: { pedido_id: pedidoId }, description: `Fotos - ${pedidoId}` },
    locale: 'pt-BR',
    success_url: `${publicUrl}/pagamento/sucesso?pedido=${pedidoId}`,
    cancel_url: `${publicUrl}/pagamento/falha?pedido=${pedidoId}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  }, { idempotencyKey: `cs_${pedidoId}` });
  return { id: sessao.id, checkoutUrl: sessao.url };
}

/**
 * Confere a assinatura do webhook sobre o corpo cru. Lança erro se não bater.
 * @param {string|Buffer} corpoCru
 * @param {string} assinatura cabeçalho Stripe-Signature
 */
function construirEvento(corpoCru, assinatura) {
  if (!corpoCru || !assinatura) throw new Error('Webhook sem corpo ou assinatura.');
  return stripe().webhooks.constructEvent(corpoCru, assinatura, process.env.STRIPE_WEBHOOK_SECRET);
}

/** Tarifa real cobrada pela Stripe, em reais, ou '' se não for possível ler (não bloqueia a venda). */
async function tarifaReal(paymentIntentId) {
  if (!paymentIntentId) return '';
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.balance_transaction'] });
    const taxa = pi.latest_charge && pi.latest_charge.balance_transaction && pi.latest_charge.balance_transaction.fee;
    return typeof taxa === 'number' ? taxa / 100 : '';
  } catch (_erro) {
    return '';
  }
}

module.exports = {
  criarSessao, construirEvento, tarifaReal, montarLinhas, centavos, EXCLUIR_NO_PIX, EXCLUIR_NO_CARTAO,
};
