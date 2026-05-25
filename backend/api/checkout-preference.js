const { criarPagamentoSchema } = require('../lib/validation');
const {
  buscarFotosParaCompra, listarRegrasPagamento, registrarPedido, novoPedidoId,
} = require('../lib/google-sheets');
const { tokenAllowsEvent } = require('../lib/gallery-access');
const { calculatePricing } = require('../lib/pricing');
const { criarPreferencia } = require('../lib/mercado-pago');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const result = criarPagamentoSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  try {
    const input = result.data;
    const items = await buscarFotosParaCompra(input.fotoIds);
    if (items.length !== input.fotoIds.length || items.some(({ foto, evento }) =>
      !evento || evento.publication !== 'publicado' || !evento.salesAuthorized ||
      !foto.availableForSale || foto.status !== 'Processada'
    )) {
      return res.status(409).json({ error: 'Uma ou mais fotos nao estao disponiveis para venda.' });
    }
    const blocked = items.find(({ evento }) =>
      evento.visibility === 'protegida' && !tokenAllowsEvent(input.galleryTokens[evento.eventoId], evento)
    );
    if (blocked) return res.status(401).json({ error: 'Acesso expirado para uma galeria protegida.' });

    const pricing = calculatePricing(items.length, input.paymentMethod, await listarRegrasPagamento());
    const id = novoPedidoId();
    const preference = await criarPreferencia({
      pedidoId: id,
      buyer: input,
      items,
      pricing,
      paymentMethod: input.paymentMethod,
    });
    await registrarPedido({
      id,
      preferenceId: preference.id,
      name: input.name,
      email: input.email,
      whatsapp: input.whatsapp,
      paymentMethod: input.paymentMethod,
      pricing,
    }, items);
    return res.status(201).json({ pedidoId: id, checkoutUrl: preference.checkoutUrl, pricing });
  } catch (error) {
    if (/Pagamento indisponivel/.test(error.message)) return res.status(409).json({ error: error.message });
    next(error);
  }
};
