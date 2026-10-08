jest.mock('../lib/google-sheets', () => ({
  buscarFotosParaCompra: jest.fn().mockResolvedValue([{
    foto: { id: 'FOTO_001', eventoId: 'EV1', price: 5, availableForSale: true, status: 'Processada' },
    evento: { eventoId: 'EV1', title: 'Missa', publication: 'publicado', salesAuthorized: true, visibility: 'publica' },
  }]),
  registrarPedido: jest.fn().mockResolvedValue(undefined),
  novoPedidoId: jest.fn(() => 'PED_TESTE_123456789'),
}));
jest.mock('../lib/stripe', () => ({
  criarPreferencia: jest.fn().mockResolvedValue({ id: 'cs_test_1', checkoutUrl: 'https://checkout.stripe.test/cs_test_1' }),
}));
jest.mock('../lib/google-drive', () => ({ fileExists: jest.fn().mockResolvedValue(true) }));
jest.mock('../lib/commercial-rules', () => ({
  calcularComercial: jest.fn(async ({ items, paymentMethod }) => {
    const { calculatePricing } = jest.requireActual('../lib/pricing');
    return calculatePricing(items.length, paymentMethod);
  }),
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const handler = require('../api/checkout-preference');
const sheets = require('../lib/google-sheets');
const drive = require('../lib/google-drive');
const stripe = require('../lib/stripe');

const app = express();
app.use(express.json());
app.all('/api/checkout/preference', handler);
app.use(errorHandler);

const VALID_BODY = {
  name: 'Maria Silva',
  email: 'maria@example.com',
  whatsapp: '99982061089',
  fotoIds: ['FOTO_001'],
  paymentMethod: 'pix',
  galleryTokens: {},
};

describe('POST /api/checkout/preference', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cria sessao de checkout Stripe com cotacao calculada no servidor', async () => {
    const res = await request(app).post('/api/checkout/preference').send({ ...VALID_BODY, total: 0.01 });
    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBe('https://checkout.stripe.test/cs_test_1');
    expect(res.body.pricing.subtotal).toBe(5);
    expect(res.body.pricing.total).toBe(5.06);
    expect(sheets.registrarPedido).toHaveBeenCalled();
  });

  it('nao cobra quando o original da foto nao existe mais no Drive', async () => {
    drive.fileExists.mockResolvedValueOnce(false);
    const res = await request(app).post('/api/checkout/preference').send(VALID_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/indisponiveis/);
    expect(stripe.criarPreferencia).not.toHaveBeenCalled();
    expect(sheets.registrarPedido).not.toHaveBeenCalled();
  });

  it('recusa fotografia sem venda autorizada', async () => {
    sheets.buscarFotosParaCompra.mockResolvedValueOnce([{
      foto: { id: 'FOTO_001', availableForSale: true, status: 'Processada' },
      evento: { publication: 'publicado', salesAuthorized: false, visibility: 'publica' },
    }]);
    const res = await request(app).post('/api/checkout/preference').send(VALID_BODY);
    expect(res.status).toBe(409);
  });

  it('valida contato obrigatorio do comprador', async () => {
    const res = await request(app).post('/api/checkout/preference').send({ ...VALID_BODY, email: '' });
    expect(res.status).toBe(400);
  });
});
