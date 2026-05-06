const { statusPagamentoSchema } = require('../lib/validation');
const { consultarStatus } = require('../lib/mercado-pago');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = statusPagamentoSchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }
    const status = await consultarStatus(result.data.transactionId);
    res.json(status);
  } catch (err) {
    next(err);
  }
};
