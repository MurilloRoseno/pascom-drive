const { statusPagamentoSchema } = require('../lib/validation');
const { consultarStatus } = require('../lib/mercado-pago');
const { buscarPedido } = require('../lib/google-sheets');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = statusPagamentoSchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }
    const { transactionId, whatsapp } = result.data;
    const pedido = await buscarPedido(transactionId);
    if (!pedido || pedido.get('WhatsApp') !== whatsapp) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    const status = await consultarStatus(transactionId);
    res.json(status);
  } catch (err) {
    next(err);
  }
};
