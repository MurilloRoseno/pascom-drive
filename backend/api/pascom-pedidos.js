const { listarPedidosPascom } = require('../lib/google-sheets');

module.exports = async function pascomPedidosHandler(req, res, next) {
  try {
    const pedidos = await listarPedidosPascom(req.query || {});
    res.json({ pedidos });
  } catch (error) {
    next(error);
  }
};
