const { validarHmac } = require('../../lib/mercado-pago');
const { atualizarStatus } = require('../../lib/google-sheets');

const processedRequests = new Set();
const processedPaymentIds = new Set();

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 5.1 — Explicit guard: if MP_WEBHOOK_SECRET is missing, fail immediately
  if (!process.env.MP_WEBHOOK_SECRET) {
    console.error('[webhook-mp] MP_WEBHOOK_SECRET não configurado');
    return res.status(500).json({ error: 'Configuração de servidor inválida' });
  }

  try {
    const signature = req.headers['x-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!signature || !validarHmac(rawBody, signature, process.env.MP_WEBHOOK_SECRET)) {
      // 5.3 — Structured logging for HMAC failures
      console.error(JSON.stringify({
        event: 'webhook_invalid_signature',
        ip: req.ip || req.headers['x-forwarded-for'],
        timestamp: new Date().toISOString(),
        hasSignature: !!signature,
      }));
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const requestId = req.headers['x-request-id'];
    if (requestId && processedRequests.has(requestId)) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    if (requestId) processedRequests.add(requestId);

    const { action, data } = req.body;
    if (action === 'payment.updated' && data && data.id) {
      // 5.2 — Deduplicate on payment ID
      const paymentId = String(data.id);
      if (processedPaymentIds.has(paymentId)) {
        return res.status(200).json({ ok: true, duplicate: true });
      }
      processedPaymentIds.add(paymentId);

      // 5.4 — Structured logging for successful payments
      console.log(JSON.stringify({
        event: 'payment_confirmed',
        paymentId,
        timestamp: new Date().toISOString(),
      }));

      await atualizarStatus(paymentId, 'Pagamento Confirmado');
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
};
