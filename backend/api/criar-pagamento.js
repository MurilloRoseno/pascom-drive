const { criarPagamentoSchema } = require('../lib/validation');
const { registrarPedido } = require('../lib/google-sheets');
const { criarPagamentoPix } = require('../lib/mercado-pago');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = criarPagamentoSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }
    const { whatsapp, fotoIds } = result.data;
    const total = typeof req.body.total === 'number' ? req.body.total : fotoIds.length * 25;

    const pagamento = await criarPagamentoPix({ whatsapp, total, fotoIds });
    await registrarPedido({ fotoIds, whatsapp, totalPago: total, idMercadoPago: pagamento.id });

    res.status(201).json(pagamento);
  } catch (err) {
    next(err);
  }
};
