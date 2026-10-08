const { detalharPedidoPascom } = require('../lib/google-sheets');

module.exports = async function pascomPedidoDetalheHandler(req, res, next) {
  try {
    const detail = await detalharPedidoPascom(req.params.pedidoId);
    if (!detail) return res.status(404).json({ error: 'Pedido nao encontrado.' });
    return res.json(detail);
  } catch (error) {
    return next(error);
  }
};
