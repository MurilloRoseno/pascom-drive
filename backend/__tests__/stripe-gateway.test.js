const mockCriar = jest.fn();
const mockConstruir = jest.fn();
const mockRecuperarPI = jest.fn();
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  checkout: { sessions: { create: mockCriar } },
  webhooks: { constructEvent: mockConstruir },
  paymentIntents: { retrieve: mockRecuperarPI },
})));

const { calculatePricing } = require('../lib/pricing');
const {
  criarSessao, construirEvento, tarifaReal, montarLinhas, centavos, EXCLUIR_NO_PIX, EXCLUIR_NO_CARTAO,
} = require('../lib/stripe-gateway');

const REGRAS = [{ method: 'pix', percentage: 1.19, fixed: 0 }, { method: 'credit_card', percentage: 3.99, fixed: 0.39 }];
const itens = (n) => Array.from({ length: n }, (_, i) => ({ foto: { id: `F${i}`, price: 5 }, evento: { title: 'Missa' } }));
const BASE = { unitPrice: 5, serviceFee: 2, convenienceFee: 1 };

const soma = (linhas) => linhas.reduce((acc, l) => acc + l.price_data.unit_amount * l.quantity, 0);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.PUBLIC_APP_URL = 'https://loja.test';
  mockCriar.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
});

describe('montarLinhas: a soma sempre fecha com o total calculado no servidor', () => {
  it.each([1, 2, 3, 7, 10, 33, 100])('%s foto(s), Pix e cartão', (n) => {
    for (const metodo of ['pix', 'credit_card']) {
      const pricing = calculatePricing(n, metodo, REGRAS, {}, BASE);
      expect(soma(montarLinhas({ items: itens(n), pricing }))).toBe(centavos(pricing.total));
    }
  });

  it('com desconto, vira uma linha só para as fotos e continua fechando', () => {
    const pricing = calculatePricing(4, 'pix', REGRAS, { discountTotal: 3.5 }, BASE);
    const linhas = montarLinhas({ items: itens(4), pricing });
    expect(linhas[0].quantity).toBe(1);
    expect(linhas[0].price_data.product_data.name).toMatch(/4 fotos selecionadas \(com desconto\)/);
    expect(soma(linhas)).toBe(centavos(pricing.total));
  });

  it('uma linha por tipo (não passa de 100 linhas mesmo com 100 fotos) e taxas aparecem separadas', () => {
    const pricing = calculatePricing(100, 'pix', REGRAS, {}, BASE);
    const linhas = montarLinhas({ items: itens(100), pricing });
    expect(linhas.length).toBeLessThanOrEqual(4);
    expect(linhas.map((l) => l.price_data.product_data.name)).toEqual(['Foto digital', 'Taxa de serviço', 'Taxa de comodidade', 'Custo estimado do pagamento']);
    expect(linhas[0]).toMatchObject({ quantity: 100, price_data: { currency: 'brl', unit_amount: 500 } });
  });

  it('linhas com valor zero são omitidas (taxa de comodidade desligada, por exemplo)', () => {
    const pricing = calculatePricing(2, 'pix', REGRAS, {}, { unitPrice: 5, serviceFee: 2, convenienceFee: 0 });
    expect(montarLinhas({ items: itens(2), pricing }).map((l) => l.price_data.product_data.name)).not.toContain('Taxa de comodidade');
  });

  it('se a soma não fechar, recusa em vez de cobrar valor diferente do mostrado', () => {
    const pricing = { ...calculatePricing(2, 'pix', REGRAS, {}, BASE), total: 99.99 };
    expect(() => montarLinhas({ items: itens(2), pricing })).toThrow(/nao fecham/);
  });
});

describe('criarSessao', () => {
  const pricing = calculatePricing(2, 'credit_card', REGRAS, {}, BASE);

  it('cria a sessão hospedada excluindo o Pix no cartão, ligada ao pedido, com idempotência', async () => {
    const r = await criarSessao({ pedidoId: 'PED_1', buyer: { email: 'a@b.com' }, items: itens(2), pricing, paymentMethod: 'credit_card' });
    expect(r).toEqual({ id: 'cs_test_1', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const [corpo, opcoes] = mockCriar.mock.calls[0];
    expect(corpo).toMatchObject({
      mode: 'payment',
      excluded_payment_method_types: EXCLUIR_NO_CARTAO,
      customer_email: 'a@b.com',
      client_reference_id: 'PED_1',
      metadata: { pedido_id: 'PED_1', meio: 'credit_card' },
      payment_intent_data: { metadata: { pedido_id: 'PED_1' } },
      success_url: 'https://loja.test/pagamento/sucesso?pedido=PED_1',
      cancel_url: 'https://loja.test/pagamento/falha?pedido=PED_1',
    });
    expect(corpo).not.toHaveProperty('payment_method_types'); // a API atual da Stripe recusa esse parâmetro
    expect(EXCLUIR_NO_CARTAO).toContain('pix');
    expect(corpo.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(opcoes).toEqual({ idempotencyKey: 'cs_PED_1' });
  });

  it('no Pix, exclui o cartão (e a carteira baseada em cartão) para ninguém pagar de cartão a cotação do Pix', async () => {
    const p = calculatePricing(2, 'pix', REGRAS, {}, BASE);
    await criarSessao({ pedidoId: 'PED_2', buyer: { email: 'a@b.com' }, items: itens(2), pricing: p, paymentMethod: 'pix' });
    expect(mockCriar.mock.calls[0][0].excluded_payment_method_types).toEqual(EXCLUIR_NO_PIX);
    expect(EXCLUIR_NO_PIX).toEqual(expect.arrayContaining(['card']));
    expect(EXCLUIR_NO_PIX).not.toContain('link'); // a API recusa 'link' em excluded_payment_method_types
  });

  it('sem chave da Stripe, não tenta cobrar', async () => {
    jest.resetModules();
    delete process.env.STRIPE_SECRET_KEY;
    const { criarSessao: criar } = require('../lib/stripe-gateway');
    await expect(criar({ pedidoId: 'P', buyer: { email: 'a@b.com' }, items: itens(2), pricing, paymentMethod: 'credit_card' })).rejects.toThrow('Stripe nao configurada');
  });
});

describe('construirEvento (assinatura do webhook)', () => {
  it('repassa corpo cru, assinatura e segredo para a verificação oficial', () => {
    mockConstruir.mockReturnValue({ id: 'evt_1' });
    expect(construirEvento('{"a":1}', 't=1,v1=abc')).toEqual({ id: 'evt_1' });
    expect(mockConstruir).toHaveBeenCalledWith('{"a":1}', 't=1,v1=abc', 'whsec_x');
  });

  it('sem corpo ou sem assinatura, recusa antes de consultar a Stripe', () => {
    expect(() => construirEvento('', 't=1,v1=abc')).toThrow();
    expect(() => construirEvento('{}', undefined)).toThrow();
    expect(mockConstruir).not.toHaveBeenCalled();
  });

  it('assinatura inválida lança erro', () => {
    mockConstruir.mockImplementation(() => { throw new Error('No signatures found'); });
    expect(() => construirEvento('{}', 't=1,v1=falsa')).toThrow('No signatures');
  });
});

describe('tarifaReal', () => {
  it('lê a tarifa cobrada, em reais', async () => {
    mockRecuperarPI.mockResolvedValue({ latest_charge: { balance_transaction: { fee: 139 } } });
    expect(await tarifaReal('pi_1')).toBe(1.39);
  });

  it('se a Stripe não responder, devolve vazio e não bloqueia a venda', async () => {
    mockRecuperarPI.mockRejectedValue(new Error('timeout'));
    expect(await tarifaReal('pi_1')).toBe('');
    expect(await tarifaReal('')).toBe('');
  });
});
