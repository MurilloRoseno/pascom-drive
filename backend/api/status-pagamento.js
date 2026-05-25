const { statusPagamentoSchema } = require('../lib/validation');
const { buscarPedidoById } = require('../lib/google-sheets');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const result = statusPagamentoSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  try {
    const pedido = await buscarPedidoById(result.data.pedidoId);
    if (!pedido) return res.status(404).json({ error: 'Pedido nao encontrado.' });
    return res.json({
      id: pedido.id,
      status: pedido.status,
      total: pedido.total,
      deliveryReady: pedido.status === 'Pagamento Confirmado',
    });
  } catch (error) {
    next(error);
  }
};
