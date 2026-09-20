const { criarDownloadsDoPedido, criarMensagemWhatsApp } = require('../lib/delivery');
const { buscarPedidoById } = require('../lib/google-sheets');

module.exports = async function pascomRegenerarDownloadsHandler(req, res, next) {
  try {
    const pedido = await buscarPedidoById(req.params.pedidoId);
    if (!pedido) return res.status(404).json({ error: 'Pedido nao encontrado.' });
    if (pedido.status !== 'Pagamento Confirmado') {
      return res.status(409).json({ error: 'Downloads so podem ser regenerados para pedidos aprovados.' });
    }
    const downloads = await criarDownloadsDoPedido(pedido);
    return res.json({
      downloads: downloads.map((item) => ({
        fotoId: item.fotoId,
        url: item.url,
        expiresAt: item.expiresAt || new Date(item.exp).toISOString(),
      })),
      whatsappMessage: criarMensagemWhatsApp(downloads),
    });
  } catch (error) {
    return next(error);
  }
};
