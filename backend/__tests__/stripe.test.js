const mockCreate = jest.fn();
jest.mock('stripe', () => {
  const Stripe = jest.fn(() => ({ checkout: { sessions: { create: mockCreate } } }));
  Stripe.webhooks = { constructEvent: jest.fn() };
  return Stripe;
});

const Stripe = require('stripe');
const { criarPreferencia, construirEventoWebhook } = require('../lib/stripe');
const { calculatePricing } = require('../lib/pricing');

const items = [
  { foto: { id: 'F1', price: 5 }, evento: { title: 'Missa' } },
  { foto: { id: 'F2', price: 5 }, evento: { title: 'Missa' } },
];
const buyer = { name: 'Maria Silva', email: 'maria@example.com', whatsapp: '99982061089' };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.PUBLIC_APP_URL = 'https://app.test';
  mockCreate.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' });
});

it('cria sessao Pix em BRL com o total igual ao pedido', async () => {
  const pricing = calculatePricing(2, 'pix');
  const result = await criarPreferencia({ pedidoId: 'PED_1', buyer, items, pricing, paymentMethod: 'pix' });
  expect(result).toEqual({ id: 'cs_test_1', checkoutUrl: 'https://checkout.stripe.test/cs_test_1' });
  const [params, options] = mockCreate.mock.calls[0];
  expect(params.excluded_payment_method_types).toEqual(['card', 'boleto']);
  expect(params).not.toHaveProperty('payment_method_types');
  expect(params.client_reference_id).toBe('PED_1');
  expect(params.success_url).toBe('https://app.test/pagamento/sucesso?pedido=PED_1');
  expect(params.line_items.every((item) => item.price_data.currency === 'brl')).toBe(true);
  expect(params.line_items.map((item) => item.price_data.product_data.name)).not.toContain('Taxa de comodidade');
  const sum = params.line_items.reduce((total, item) => total + item.price_data.unit_amount, 0);
  expect(sum).toBe(1012);
  expect(options).toEqual({ idempotencyKey: 'PED_1' });
});

it('cria sessao de cartao com as duas taxas discriminadas', async () => {
  const pricing = calculatePricing(2, 'credit_card');
  await criarPreferencia({ pedidoId: 'PED_2', buyer, items, pricing, paymentMethod: 'credit_card' });
  const [params] = mockCreate.mock.calls[0];
  expect(params.excluded_payment_method_types).toEqual(['pix', 'boleto']);
  const byName = Object.fromEntries(params.line_items.map((item) => [item.price_data.product_data.name, item.price_data.unit_amount]));
  expect(byName['Taxa de servico']).toBe(43);
  expect(byName['Taxa de comodidade']).toBe(39);
});

it('agrupa as fotos em uma linha quando ha desconto', async () => {
  const pricing = calculatePricing(2, 'pix', { discountTotal: 2 });
  await criarPreferencia({ pedidoId: 'PED_3', buyer, items, pricing, paymentMethod: 'pix' });
  const [params] = mockCreate.mock.calls[0];
  expect(params.line_items[0].price_data.unit_amount).toBe(800);
  expect(params.line_items[0].price_data.product_data.name).toBe('2 fotos selecionadas');
});

it('falha sem chave configurada', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  await expect(criarPreferencia({ pedidoId: 'PED_4', buyer, items, pricing: calculatePricing(2, 'pix'), paymentMethod: 'pix' }))
    .rejects.toThrow(/Stripe nao configurado/);
});

it('devolve null quando a assinatura do webhook e invalida', () => {
  Stripe.webhooks.constructEvent.mockImplementationOnce(() => { throw new Error('bad signature'); });
  expect(construirEventoWebhook({ rawBody: '{}', signature: 't=1,v1=x', secret: 'whsec_x' })).toBeNull();
  expect(construirEventoWebhook({ rawBody: '{}', signature: '', secret: 'whsec_x' })).toBeNull();
});

it('devolve o evento quando a assinatura confere', () => {
  Stripe.webhooks.constructEvent.mockReturnValueOnce({ id: 'evt_1' });
  expect(construirEventoWebhook({ rawBody: '{}', signature: 't=1,v1=x', secret: 'whsec_x' })).toEqual({ id: 'evt_1' });
});
