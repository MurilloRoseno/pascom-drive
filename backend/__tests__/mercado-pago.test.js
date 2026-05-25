const crypto = require('crypto');
const { paymentMethods, validarAssinaturaWebhook } = require('../lib/mercado-pago');

describe('metodos permitidos no Checkout Pro', () => {
  it('limita credito a uma parcela e separa pix de cartoes', () => {
    expect(paymentMethods('pix').default_payment_method_id).toBe('pix');
    expect(paymentMethods('credit_card').installments).toBe(1);
    expect(paymentMethods('credit_card').excluded_payment_methods).toContainEqual({ id: 'pix' });
  });
});

describe('assinatura oficial de webhook Mercado Pago', () => {
  const secret = 'test_secret';
  const dataId = 'PAY_123';
  const requestId = 'REQ_123';
  const ts = '1710000000';

  it('aceita manifesto assinado com id, request-id e timestamp', () => {
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    expect(validarAssinaturaWebhook({
      dataId, requestId, secret, signature: `ts=${ts},v1=${digest}`,
    })).toBe(true);
  });

  it('recusa assinatura alterada', () => {
    expect(validarAssinaturaWebhook({
      dataId, requestId, secret, signature: `ts=${ts},v1=invalid`,
    })).toBe(false);
  });
});
