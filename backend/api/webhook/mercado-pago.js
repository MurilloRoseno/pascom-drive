const {
  registrarWebhookSeNovo, finalizarWebhook, atualizarPedidoPagamento,
  buscarPedidoByPreferenceOrPayment, registrarEntrega, marcarPedidoDivergente,
} = require('../../lib/google-sheets');
const { validarAssinaturaWebhook, consultarPagamento } = require('../../lib/mercado-pago');
const { criarDownloadsDoPedido, enviarEmailEntrega, criarMensagemWhatsApp } = require('../../lib/delivery');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuracao de servidor invalida' });
  try {
    const dataId = String((req.body.data && req.body.data.id) || req.query['data.id'] || '');
    const requestId = String(req.headers['x-request-id'] || '');
    const signature = req.headers['x-signature'];
    if (!validarAssinaturaWebhook({ dataId, requestId, signature, secret })) {
      console.warn(JSON.stringify({
        event: 'webhook_signature_invalid',
        severity: 'critical',
        dataId,
        requestId,
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        ts: new Date().toISOString(),
      }));
      return res.status(401).json({ error: 'Assinatura invalida' });
    }
    const action = String(req.body.action || req.body.type || 'payment');
    const eventKey = `${requestId}:${dataId}:${action}`;
    if (!(await registrarWebhookSeNovo(eventKey, dataId, action))) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    const payment = await consultarPagamento(dataId);
    const reference = payment.external_reference || (payment.metadata && payment.metadata.pedido_id);
    const stored = await buscarPedidoByPreferenceOrPayment(reference || String(payment.id));
    if (!stored) {
      await finalizarWebhook(eventKey, 'PedidoNaoEncontrado');
      return res.status(202).json({ ok: true, unmatched: true });
    }
    if (payment.status === 'approved') {
      const expectedTotal = Number(stored.total || 0);
      const paidAmount = Number(payment.transaction_amount || 0);
      const currency = String(payment.currency_id || '');
      if (currency !== 'BRL' || Math.abs(paidAmount - expectedTotal) > 0.01) {
        console.warn(JSON.stringify({
          event: 'payment_amount_mismatch',
          severity: 'critical',
          pedidoId: stored.id,
          paymentId: String(payment.id || ''),
          expectedTotal,
          paidAmount,
          currency,
          ts: new Date().toISOString(),
        }));
        await marcarPedidoDivergente(stored.id, 'Valor ou moeda divergente no Mercado Pago', payment);
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
