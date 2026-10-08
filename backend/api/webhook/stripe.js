const {
  registrarWebhookSeNovo, finalizarWebhook, atualizarPedidoPagamento,
  buscarPedidoByPreferenceOrPayment, registrarEntrega, marcarPedidoDivergente,
} = require('../../lib/google-sheets');
const { construirEventoWebhook } = require('../../lib/stripe');
const { criarDownloadsDoPedido, enviarEmailEntrega, criarMensagemWhatsApp } = require('../../lib/delivery');

const SESSION_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
];

function paymentStatus(type, session) {
  if (type === 'checkout.session.async_payment_succeeded') return 'approved';
  if (type === 'checkout.session.completed') return session.payment_status === 'paid' ? 'approved' : 'pending';
  if (type === 'checkout.session.async_payment_failed') return 'rejected';
  return 'expired';
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuracao de servidor invalida' });
  try {
    const event = construirEventoWebhook({
      rawBody: req.rawBody,
      signature: req.headers['stripe-signature'],
      secret,
    });
    if (!event) {
      console.warn(JSON.stringify({
        event: 'webhook_signature_invalid',
        severity: 'critical',
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        ts: new Date().toISOString(),
      }));
      return res.status(401).json({ error: 'Assinatura invalida' });
    }
    if (!SESSION_EVENTS.includes(event.type)) return res.status(200).json({ ok: true, ignored: true });

    const session = event.data.object;
    const paymentId = String(session.payment_intent || session.id);
    const eventKey = String(event.id);
    if (!(await registrarWebhookSeNovo(eventKey, paymentId, event.type))) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    const reference = session.client_reference_id || (session.metadata && session.metadata.pedido_id);
    const stored = await buscarPedidoByPreferenceOrPayment(reference || String(session.id));
    if (!stored) {
      await finalizarWebhook(eventKey, 'PedidoNaoEncontrado');
      return res.status(202).json({ ok: true, unmatched: true });
    }
    const payment = { id: paymentId, status: paymentStatus(event.type, session) };
    if (payment.status !== 'approved' && stored.status === 'Pagamento Confirmado') {
      await finalizarWebhook(eventKey, 'Processado');
      return res.json({ ok: true });
    }
    if (payment.status === 'approved') {
      const expectedTotal = Number(stored.total || 0);
      const paidAmount = Number(session.amount_total || 0) / 100;
      const currency = String(session.currency || '').toUpperCase();
      if (currency !== 'BRL' || Math.abs(paidAmount - expectedTotal) > 0.01) {
        console.warn(JSON.stringify({
          event: 'payment_amount_mismatch',
          severity: 'critical',
          pedidoId: stored.id,
          paymentId,
          expectedTotal,
          paidAmount,
          currency,
          ts: new Date().toISOString(),
        }));
        await marcarPedidoDivergente(stored.id, 'Valor ou moeda divergente no Stripe', payment);
        await finalizarWebhook(eventKey, 'PagamentoDivergente');
        return res.status(202).json({ ok: true, divergent: true });
      }
    }
    const pedido = await atualizarPedidoPagamento(stored.id, payment);
    if (payment.status === 'approved') {
      const downloads = await criarDownloadsDoPedido(pedido);
      const emailResult = await enviarEmailEntrega(pedido, downloads);
      const digits = String(pedido.whatsapp || '').replace(/\D/g, '');
      const number = digits.startsWith('55') ? digits : `55${digits}`;
      const whatsappLink = `https://wa.me/${number}?text=${encodeURIComponent(criarMensagemWhatsApp(downloads))}`;
      await registrarEntrega(pedido.id, { emailResult, whatsappLink });
    }
    await finalizarWebhook(eventKey, 'Processado');
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
