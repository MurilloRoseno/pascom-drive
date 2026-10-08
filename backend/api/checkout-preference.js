const { criarPagamentoSchema } = require('../lib/validation');
const {
  buscarFotosParaCompra, registrarPedido, novoPedidoId,
} = require('../lib/google-sheets');
const { tokenAllowsEvent } = require('../lib/gallery-access');
const { calcularComercial } = require('../lib/commercial-rules');
const { criarPreferencia } = require('../lib/stripe');
const { fileExists } = require('../lib/google-drive');

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

    // Nunca cobrar por uma foto cujo original nao pode mais ser entregue.
    const originals = await Promise.all(items.map(({ foto }) => fileExists(foto.originalFileId)));
    const missing = items.filter((_item, index) => !originals[index]).map(({ foto }) => foto.id);
    if (missing.length) {
      console.error(JSON.stringify({
        event: 'checkout_original_missing', severity: 'critical', fotoIds: missing, ts: new Date().toISOString(),
      }));
      return res.status(409).json({ error: 'Uma ou mais fotos estao temporariamente indisponiveis para compra. Fale com a secretaria.' });
    }

    const pricing = await calcularComercial({
      items,
      paymentMethod: input.paymentMethod,
      couponCode: input.couponCode,
      packageId: input.packageId,
    });
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
      couponCode: pricing.couponApplied?.code || '',
      packageId: pricing.packageApplied?.id || '',
      pricing,
    }, items);
    return res.status(201).json({ pedidoId: id, checkoutUrl: preference.checkoutUrl, pricing });
  } catch (error) {
    if (/Pagamento indisponivel|Cupom invalido|Pacote invalido/.test(error.message)) return res.status(409).json({ error: error.message });
    next(error);
  }
};
