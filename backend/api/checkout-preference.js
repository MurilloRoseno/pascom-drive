const { criarPagamentoSchema } = require('../lib/validation');
const { buscarFotosParaCompra, registrarPedido, novoPedidoId } = require('../lib/google-sheets');
const { regrasPagamento } = require('../lib/tarifas');
const { gatewayAtivo } = require('../lib/gateway');
const { tokenAllowsEvent } = require('../lib/gallery-access');
const { calcularComercial } = require('../lib/commercial-rules');
const { criarPreferencia } = require('../lib/mercado-pago');
const { criarSessao } = require('../lib/stripe-gateway');

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

    const pricing = await calcularComercial({
      items,
      paymentMethod: input.paymentMethod,
      paymentRules: await regrasPagamento(),
      couponCode: input.couponCode,
      packageId: input.packageId,
    });
    const id = novoPedidoId();
    // O valor de cada foto é o preço em vigor (configuração do servidor), não o que estiver na planilha de fotos.
    const precificados = items.map((item) => ({ ...item, foto: { ...item.foto, price: pricing.unitPrice } }));
    const gateway = gatewayAtivo();
    const dados = {
      pedidoId: id,
      buyer: input,
      items: precificados,
      pricing,
      paymentMethod: input.paymentMethod,
    };
    let preference;
    try {
      preference = gateway === 'stripe' ? await criarSessao(dados) : await criarPreferencia(dados);
    } catch (error) {
      if (gateway === 'stripe' && input.paymentMethod === 'pix' && /pix/i.test(error.message || '')) {
        return res.status(409).json({ error: 'O Pix não está disponível no momento. Escolha cartão de crédito.' });
      }
      throw error;
    }
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
    }, precificados);
    return res.status(201).json({ pedidoId: id, checkoutUrl: preference.checkoutUrl, pricing: { ...pricing, gateway } });
  } catch (error) {
    if (/Pagamento indisponivel|Cupom invalido|Pacote invalido/.test(error.message)) return res.status(409).json({ error: error.message });
    next(error);
  }
};
