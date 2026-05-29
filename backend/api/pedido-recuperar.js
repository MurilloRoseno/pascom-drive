const { recuperarPedidoSchema } = require('../lib/validation');
const { buscarPedidoById, listarItensPedido } = require('../lib/google-sheets');
const { criarDownloadsDoPedido, criarMensagemWhatsApp } = require('../lib/delivery');

function sameEmail(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const result = recuperarPedidoSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  try {
    const input = result.data;
    const pedido = await buscarPedidoById(input.pedidoId);
    if (!pedido || !sameEmail(pedido.email, input.email)) {
      return res.status(404).json({ error: 'Pedido nao encontrado para os dados informados.' });
    }
    const items = await listarItensPedido(pedido.id);
    const response = {
      pedidoId: pedido.id,
      status: pedido.status,
      total: pedido.total,
      createdAt: pedido.createdAt || '',
      paidAt: pedido.paidAt || '',
      itemCount: items.length,
      deliveryReady: pedido.status === 'Pagamento Confirmado',
      downloads: [],
      whatsappMessage: '',
    };
    if (pedido.status === 'Pagamento Confirmado') {
      const downloads = await criarDownloadsDoPedido(pedido);
      response.downloads = downloads.map((item) => ({
        fotoId: item.fotoId,
        url: item.url,
        expiresAt: new Date(item.exp).toISOString(),
      }));
      response.whatsappMessage = criarMensagemWhatsApp(downloads);
    }
    return res.json(response);
  } catch (error) {
    next(error);
  }
};
