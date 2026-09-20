const {
  registrarWebhookSeNovo, finalizarWebhook, atualizarPedidoPagamento,
  buscarPedidoByPreferenceOrPayment, marcarPedidoDivergente,
} = require('../../lib/google-sheets');
const { validarAssinaturaWebhook, consultarPagamento } = require('../../lib/mercado-pago');
const { conferirValor, entregarPedidoPago, marcarEntregaPendente } = require('../../lib/order-fulfillment');

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
      const conferencia = conferirValor(payment, stored);
      if (!conferencia.ok) {
        console.warn(JSON.stringify({
          event: 'payment_amount_mismatch',
          severity: 'critical',
          pedidoId: stored.id,
          paymentId: String(payment.id || ''),
          expectedTotal: conferencia.esperado,
          paidAmount: conferencia.pago,
          currency: conferencia.moeda,
          ts: new Date().toISOString(),
        }));
        await marcarPedidoDivergente(stored.id, conferencia.motivo, payment);
        await finalizarWebhook(eventKey, 'PagamentoDivergente');
        return res.status(202).json({ ok: true, divergent: true });
      }
    }
    const pedido = await atualizarPedidoPagamento(stored.id, payment);
    if (payment.status === 'approved') {
      try {
        await entregarPedidoPago(pedido, { motivo: 'webhook' });
      } catch (error) {
        // O pagamento ja esta confirmado: deixar o pedido marcado como entrega pendente,
        // para a conciliacao do gatilho de 5 minutos terminar o servico.
        await marcarEntregaPendente(stored.id, error);
        await finalizarWebhook(eventKey, 'EntregaPendente');
        return res.status(200).json({ ok: true, entregaPendente: true });
      }
    }
    await finalizarWebhook(eventKey, 'Processado');
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
