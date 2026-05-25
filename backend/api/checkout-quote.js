const { cotacaoSchema } = require('../lib/validation');
const { buscarFotosParaCompra, listarRegrasPagamento } = require('../lib/google-sheets');
const { tokenAllowsEvent } = require('../lib/gallery-access');
const { calculatePricing } = require('../lib/pricing');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const result = cotacaoSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Carrinho invalido.' });
  try {
    const input = result.data;
    const items = await buscarFotosParaCompra(input.fotoIds);
    if (items.length !== input.fotoIds.length || items.some(({ foto, evento }) =>
      !evento || evento.publication !== 'publicado' || !evento.salesAuthorized ||
      !foto.availableForSale || foto.status !== 'Processada'
    )) return res.status(409).json({ error: 'Uma ou mais fotos nao estao disponiveis.' });
    if (items.some(({ evento }) =>
      evento.visibility === 'protegida' && !tokenAllowsEvent(input.galleryTokens[evento.eventoId], evento)
    )) return res.status(401).json({ error: 'Acesso expirado para galeria protegida.' });
    return res.json({ pricing: calculatePricing(items.length, input.paymentMethod, await listarRegrasPagamento()) });
  } catch (error) {
    if (/Pagamento indisponivel/.test(error.message)) return res.status(409).json({ error: error.message });
    next(error);
  }
};
