const { MercadoPagoConfig, Payment } = require('mercadopago');
const crypto = require('crypto');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});
const payment = new Payment(client);

async function criarPagamentoPix({ whatsapp, total, fotoIds }) {
  const result = await payment.create({
    body: {
      transaction_amount: total,
      payment_method_id: 'pix',
      description: `Fotos: ${fotoIds.join(', ')}`,
      payer: {
        email: `${whatsapp}@pascom.pix`,
      },
    },
  });
  return {
    id: String(result.id),
    qrCode: result.point_of_interaction.transaction_data.qr_code,
    qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
  };
}

async function consultarStatus(paymentId) {
  const result = await payment.get({ id: paymentId });
  return { id: String(result.id), status: result.status };
}

function validarHmac(body, signature, secret) {
  if (!body || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch (_e) {
    return false;
  }
}

module.exports = { criarPagamentoPix, consultarStatus, validarHmac };
