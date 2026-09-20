// Acoes de atendimento sobre um pedido: reenviar a entrega e conferir no Mercado Pago.
// A regra e o trabalho ficam em lib/order-fulfillment.js; aqui so entra o que o painel ve.
const { buscarPedidoById } = require('../lib/google-sheets');
const { entregarPedidoPago, conciliarPedido } = require('../lib/order-fulfillment');
const { STATUS_CONFIRMADO } = require('../lib/delivery-health');
const { criarMensagemWhatsApp } = require('../lib/delivery');

function resumoPedido(pedido) {
  if (!pedido) return null;
  return {
    id: pedido.id,
    status: pedido.status,
    paymentId: pedido.paymentId || '',
    emailStatus: pedido.emailStatus || '',
    emailError: pedido.emailError || '',
    deliveryAttempts: Number(pedido.deliveryAttempts || 0),
    deliveryNextAt: pedido.deliveryNextAt || '',
  };
}

async function reenviar(req, res, next) {
  try {
    const pedido = await buscarPedidoById(req.params.pedidoId);
    if (!pedido) return res.status(404).json({ error: 'Pedido nao encontrado.' });
    if (pedido.status !== STATUS_CONFIRMADO) {
      return res.status(409).json({ error: 'So e possivel reenviar a entrega de pedidos aprovados.' });
    }
    // Reenvio manual recomeca o contador: as tentativas automaticas voltam a valer.
    const entrega = await entregarPedidoPago({ ...pedido, deliveryAttempts: 0 }, { motivo: 'painel' });
    return res.json({
      emailStatus: entrega.emailResult.status,
      emailError: entrega.emailResult.error || '',
      whatsappLink: entrega.whatsappLink,
      whatsappMessage: criarMensagemWhatsApp(entrega.downloads),
      downloads: entrega.downloads.map((item) => ({
        fotoId: item.fotoId,
        url: item.url,
        expiresAt: item.expiresAt,
      })),
      pedido: resumoPedido(await buscarPedidoById(req.params.pedidoId)),
    });
  } catch (error) {
    return next(error);
  }
}

async function conferir(req, res, next) {
  try {
    const pedido = await buscarPedidoById(req.params.pedidoId);
    if (!pedido) return res.status(404).json({ error: 'Pedido nao encontrado.' });
    const resultado = await conciliarPedido(pedido);
    return res.json({
      situacao: resultado.situacao,
      statusMp: resultado.statusMp || '',
      motivo: resultado.motivo || '',
      paymentId: resultado.paymentId || '',
      emailStatus: (resultado.entrega && resultado.entrega.emailResult.status) || '',
      pedido: resumoPedido(await buscarPedidoById(req.params.pedidoId)),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { reenviar, conferir };
