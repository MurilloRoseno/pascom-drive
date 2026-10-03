jest.mock('../lib/google-sheets', () => ({
  buscarFotosParaCompra: jest.fn().mockResolvedValue([{
    foto: { id: 'FOTO_001', eventoId: 'EV1', price: 99, availableForSale: true, status: 'Processada' },
    evento: { eventoId: 'EV1', title: 'Missa', publication: 'publicado', salesAuthorized: true, visibility: 'publica' },
  }]),
  registrarPedido: jest.fn().mockResolvedValue(undefined),
  novoPedidoId: jest.fn(() => 'PED_TESTE_123456789'),
}));
jest.mock('../lib/tarifas', () => ({
  regrasPagamento: jest.fn().mockResolvedValue([{ method: 'pix', percentage: 1, fixed: 0 }, { method: 'credit_card', percentage: 4, fixed: 0.4 }]),
}));
jest.mock('../lib/mercado-pago', () => ({
  criarPreferencia: jest.fn().mockResolvedValue({ id: 'PREF_1', checkoutUrl: 'https://mp.test/checkout' }),
}));
jest.mock('../lib/stripe-gateway', () => ({
  criarSessao: jest.fn().mockResolvedValue({ id: 'cs_test_1', checkoutUrl: 'https://checkout.stripe.test/c/pay/cs_test_1' }),
}));
jest.mock('../lib/commercial-rules', () => ({
  calcularComercial: jest.fn(async ({ items, paymentMethod, paymentRules }) => {
    const { calculatePricing } = jest.requireActual('../lib/pricing');
    return calculatePricing(items.length, paymentMethod, paymentRules);
  }),
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const handler = require('../api/checkout-preference');
const sheets = require('../lib/google-sheets');
const mp = require('../lib/mercado-pago');
const stripe = require('../lib/stripe-gateway');

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

const ENV = process.env.PAYMENT_GATEWAY;
afterAll(() => {
  if (ENV === undefined) delete process.env.PAYMENT_GATEWAY; else process.env.PAYMENT_GATEWAY = ENV;
});

describe('POST /api/checkout/preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PAYMENT_GATEWAY;
  });

  it('sem PAYMENT_GATEWAY segue no Mercado Pago, com cotação calculada no servidor', async () => {
    const res = await request(app).post('/api/checkout/preference').send({ ...VALID_BODY, total: 0.01 });
    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBe('https://mp.test/checkout');
    expect(res.body.pricing.gateway).toBe('mercadopago');
    expect(res.body.pricing.subtotal).toBe(10);
    expect(res.body.pricing.total).toBeGreaterThan(13);
    expect(sheets.registrarPedido).toHaveBeenCalled();
    expect(stripe.criarSessao).not.toHaveBeenCalled();
  });

  describe('com PAYMENT_GATEWAY=stripe', () => {
    beforeEach(() => { process.env.PAYMENT_GATEWAY = 'stripe'; });

    it('cria a sessão da Stripe com o valor do servidor e guarda o id da sessão no pedido', async () => {
      const res = await request(app).post('/api/checkout/preference').send({ ...VALID_BODY, total: 0.01, gateway: 'mercadopago', amount: 1 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ pedidoId: 'PED_TESTE_123456789', checkoutUrl: 'https://checkout.stripe.test/c/pay/cs_test_1' });
      expect(res.body.pricing.gateway).toBe('stripe');
      expect(mp.criarPreferencia).not.toHaveBeenCalled();
      const dados = stripe.criarSessao.mock.calls[0][0];
      expect(dados.pricing.total).toBe(res.body.pricing.total);
      expect(dados.pricing.total).toBeGreaterThan(13); // nunca o 0,01 que veio do navegador
      expect(dados.paymentMethod).toBe('pix');
      expect(sheets.registrarPedido.mock.calls[0][0]).toMatchObject({ id: 'PED_TESTE_123456789', preferenceId: 'cs_test_1' });
    });

    it('o valor da foto é o preço em vigor, não o que estiver na planilha de fotos', async () => {
      await request(app).post('/api/checkout/preference').send(VALID_BODY);
      const itens = stripe.criarSessao.mock.calls[0][0].items;
      expect(itens[0].foto.price).toBe(10); // a planilha dizia 99
      expect(sheets.registrarPedido.mock.calls[0][1][0].foto.price).toBe(10);
    });

    it('Pix indisponível na conta Stripe vira aviso claro (409) e nenhum pedido é gravado', async () => {
      stripe.criarSessao.mockRejectedValueOnce(new Error('No valid payment method types for this Checkout Session. Please ensure that you have activated payment methods compatible with the chosen currency in your dashboard.'));
      const res = await request(app).post('/api/checkout/preference').send(VALID_BODY);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Pix não está disponível/);
      expect(sheets.registrarPedido).not.toHaveBeenCalled();
    });

    it('erro de parâmetro que só cita "pix" NÃO vira aviso de Pix indisponível (foi o que escondeu um bug de verdade)', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      stripe.criarSessao.mockRejectedValueOnce(new Error('Invalid excluded_payment_method_types[2]: must be one of card, boleto, pix'));
      const res = await request(app).post('/api/checkout/preference').send(VALID_BODY);
      expect(res.status).toBe(500);
      expect(res.body.error).not.toMatch(/Pix não está disponível/);
    });

    it('outro erro da Stripe não vaza detalhes e não grava pedido', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      stripe.criarSessao.mockRejectedValueOnce(new Error('chave sk_test_secreta invalida'));
      const res = await request(app).post('/api/checkout/preference').send({ ...VALID_BODY, paymentMethod: 'credit_card' });
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/sk_test/);
      expect(sheets.registrarPedido).not.toHaveBeenCalled();
    });
  });

  it('recusa fotografia sem venda autorizada', async () => {
    sheets.buscarFotosParaCompra.mockResolvedValueOnce([{
      foto: { id: 'FOTO_001', availableForSale: true, status: 'Processada' },
      evento: { publication: 'publicado', salesAuthorized: false, visibility: 'publica' },
    }]);
    const res = await request(app).post('/api/checkout/preference').send(VALID_BODY);
    expect(res.status).toBe(409);
  });

  it('recusa evento agendado ou arquivado (estado efetivo da publicação)', async () => {
    for (const publication of ['agendado', 'arquivado', 'rascunho']) {
      sheets.buscarFotosParaCompra.mockResolvedValueOnce([{
        foto: { id: 'FOTO_001', availableForSale: true, status: 'Processada' },
        evento: { publication, salesAuthorized: true, visibility: 'publica' },
      }]);
      expect((await request(app).post('/api/checkout/preference').send(VALID_BODY)).status).toBe(409);
    }
    expect(sheets.registrarPedido).not.toHaveBeenCalled();
  });

  it('valida contato obrigatorio do comprador', async () => {
    const res = await request(app).post('/api/checkout/preference').send({ ...VALID_BODY, email: '' });
    expect(res.status).toBe(400);
  });
});
