const { validarHmac } = require('../../lib/mercado-pago');
const { atualizarStatus } = require('../../lib/google-sheets');

const processedRequests = new Set();

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const signature = req.headers['x-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    if (!signature || !validarHmac(rawBody, signature, process.env.MP_WEBHOOK_SECRET)) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const requestId = req.headers['x-request-id'];
    if (requestId && processedRequests.has(requestId)) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    if (requestId) processedRequests.add(requestId);

    const { action, data } = req.body;
    if (action === 'payment.updated' && data && data.id) {
      await atualizarStatus(String(data.id), 'Pagamento Confirmado');
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
};
