jest.mock('../lib/config-store', () => ({ lerConfig: jest.fn() }));
jest.mock('../lib/google-sheets.catalog', () => ({
  listarRegrasPagamento: jest.fn().mockResolvedValue([{ method: 'pix', percentage: 0.99, fixed: 0 }]),
}));

const { lerConfig } = require('../lib/config-store');
const { listarRegrasPagamento } = require('../lib/google-sheets.catalog');
const { precosBase, regrasPagamento } = require('../lib/tarifas');
const { gatewayAtivo } = require('../lib/gateway');
const { calculatePricing } = require('../lib/pricing');

const CONFIG = {
  precoFoto: 5, taxaServico: 2, taxaComodidade: 1, tarifaPixPct: 1.19, tarifaPixFixo: 0, tarifaCartaoPct: 3.99, tarifaCartaoFixo: 0.39,
};
const ENV = process.env.PAYMENT_GATEWAY;

beforeEach(() => {
  jest.clearAllMocks();
  lerConfig.mockResolvedValue(CONFIG);
});
afterAll(() => {
  if (ENV === undefined) delete process.env.PAYMENT_GATEWAY; else process.env.PAYMENT_GATEWAY = ENV;
});

describe('gatewayAtivo (só o ambiente decide)', () => {
  it.each([
    [undefined, 'mercadopago'], ['', 'mercadopago'], ['stripe', 'stripe'], [' STRIPE ', 'stripe'], ['mercadopago', 'mercadopago'], ['paypal', 'mercadopago'],
  ])('PAYMENT_GATEWAY=%j -> %s', (valor, esperado) => {
    if (valor === undefined) delete process.env.PAYMENT_GATEWAY; else process.env.PAYMENT_GATEWAY = valor;
    expect(gatewayAtivo()).toBe(esperado);
  });
});

describe('precosBase', () => {
  it('traz o preço da foto e as taxas fixas da configuração', async () => {
    expect(await precosBase()).toEqual({ unitPrice: 5, serviceFee: 2, convenienceFee: 1 });
  });

  it('mudar a configuração muda o valor da cotação', async () => {
    lerConfig.mockResolvedValue({ ...CONFIG, precoFoto: 8, taxaServico: 0, taxaComodidade: 0.5 });
    const base = await precosBase();
    const q = calculatePricing(3, 'pix', [{ method: 'pix', percentage: 0, fixed: 0 }], {}, base);
    expect(q.subtotal).toBe(24);
    expect(q.total).toBe(24.5);
  });
});

describe('regrasPagamento', () => {
  it('com Stripe, as tarifas vêm da configuração do painel', async () => {
    process.env.PAYMENT_GATEWAY = 'stripe';
    expect(await regrasPagamento()).toEqual([
      { method: 'pix', percentage: 1.19, fixed: 0 },
      { method: 'credit_card', percentage: 3.99, fixed: 0.39 },
    ]);
    expect(listarRegrasPagamento).not.toHaveBeenCalled();
  });

  it('com Mercado Pago (legado), segue a aba RegrasPagamento', async () => {
    delete process.env.PAYMENT_GATEWAY;
    expect(await regrasPagamento()).toEqual([{ method: 'pix', percentage: 0.99, fixed: 0 }]);
    expect(lerConfig).not.toHaveBeenCalled();
  });
});

describe('cotação com os valores padrão da Stripe (R$ 5,00 + R$ 2,00 + R$ 1,00)', () => {
  it('1 foto no cartão: o comprador vê foto, taxas e custo, e o total repassa a tarifa por cima', async () => {
    process.env.PAYMENT_GATEWAY = 'stripe';
    const q = calculatePricing(1, 'credit_card', await regrasPagamento(), {}, await precosBase());
    expect(q).toMatchObject({ unitPrice: 5, subtotal: 5, serviceFee: 2, convenienceFee: 1 });
    // líquido de R$ 8,00 depois de 3,99% + R$ 0,39 sobre o total cobrado
    expect(q.total).toBe(8.74);
    expect(q.paymentCost).toBe(0.74);
    expect(Math.round((q.total * (1 - 0.0399) - 0.39) * 100)).toBe(800);
  });

  it('recusa tarifa inválida (inclusive texto que vira NaN) em vez de calcular um total errado', () => {
    expect(() => calculatePricing(1, 'pix', [{ method: 'pix', percentage: '0,99', fixed: 0 }])).toThrow(/Taxa administrativa invalida/);
    expect(() => calculatePricing(1, 'pix', [{ method: 'pix', percentage: 100, fixed: 0 }])).toThrow(/Taxa administrativa invalida/);
  });
});
