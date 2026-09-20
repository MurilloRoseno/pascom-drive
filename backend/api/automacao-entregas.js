// Rota interna chamada pelo gatilho de 5 minutos do Apps Script (google-apps-script/Entregas.js).
// Nao e publica: exige a assinatura HMAC de worker, a mesma de /api/admin/cache/invalidate.
const { z } = require('zod');
const { authorizeWorker } = require('../lib/worker-auth');
const { conciliarEntregas } = require('../lib/order-fulfillment');

const schema = z.object({
  limiteMs: z.number().int().min(2000).max(25000).optional(),
  auditoria: z.boolean().optional(),
  varredura: z.boolean().optional(),
}).strict();

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorizeWorker(req, {
    legacyHeader: 'x-watermark-secret',
    legacySecret: process.env.WATERMARK_API_SECRET,
  })) {
    return res.status(401).json({ error: 'Nao autorizado.' });
  }

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Parametros de conciliacao invalidos.' });

  res.setHeader('Cache-Control', 'private, no-store');
  try {
    return res.json(await conciliarEntregas(parsed.data));
  } catch (error) {
    return next(error);
  }
};
