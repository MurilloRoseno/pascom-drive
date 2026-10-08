const crypto = require('crypto');
const { paymentMethods, validarAssinaturaWebhook } = require('../lib/mercado-pago');

describe('metodos permitidos no Checkout Pro', () => {
  it('mantem Pix disponivel sem forcar metodo padrao incompativel', () => {
    const pix = paymentMethods('pix');
    const credit = paymentMethods('credit_card');
    expect(pix).not.toHaveProperty('default_payment_method_id');
    expect(pix.excluded_payment_types).not.toContainEqual({ id: 'bank_transfer' });
    expect(credit.installments).toBe(1);
    expect(credit.excluded_payment_types).toContainEqual({ id: 'bank_transfer' });
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
