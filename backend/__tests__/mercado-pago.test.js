const crypto = require('crypto');

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn(() => ({
    create: jest.fn().mockResolvedValue({
      id: 'MP_PAY_123',
      point_of_interaction: {
        transaction_data: {
          qr_code: 'QR_STRING',
          qr_code_base64: 'BASE64_QR',
        },
      },
    }),
    get: jest.fn().mockResolvedValue({ id: 'MP_PAY_123', status: 'approved' }),
  })),
}));

const { criarPagamentoPix, consultarStatus, validarHmac } = require('../lib/mercado-pago');

describe('criarPagamentoPix', () => {
  it('retorna id, qrCode e qrCodeBase64', async () => {
    const result = await criarPagamentoPix({ whatsapp: '11999999999', total: 25.75, fotoIds: ['FOTO_001'] });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('qrCode');
    expect(result).toHaveProperty('qrCodeBase64');
  });
});

describe('consultarStatus', () => {
  it('retorna status do pagamento', async () => {
    const result = await consultarStatus('MP_PAY_123');
    expect(result).toHaveProperty('status');
    expect(result.status).toBe('approved');
  });
});

describe('validarHmac', () => {
  const secret = 'test_secret';
  const body = JSON.stringify({ action: 'payment.updated', data: { id: '123' } });

  it('retorna true para assinatura válida', () => {
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(validarHmac(body, sig, secret)).toBe(true);
  });

  it('retorna false para assinatura inválida', () => {
    expect(validarHmac(body, 'assinatura_errada', secret)).toBe(false);
  });

  it('retorna false para body vazio', () => {
    expect(validarHmac('', 'qualquer', secret)).toBe(false);
  });
});
