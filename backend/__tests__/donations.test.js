const {
  calcularDoacao, configPublica, criarTokenAssinatura, destinoPorId, lerTokenAssinatura, novaDoacaoId, LIMITES,
} = require('../lib/donations');
const { signToken } = require('../lib/jwt-utils');

describe('calcularDoacao', () => {
  it('cobra exatamente a oferta quando o doador nao cobre a taxa', () => {
    expect(calcularDoacao({ amount: 50, method: 'pix', coverFees: false }))
      .toEqual({ amount: 50, fee: 0, total: 50, method: 'pix', coverFees: false });
  });

  it('soma a taxa do Pix quando o doador decide cobrir', () => {
    const resumo = calcularDoacao({ amount: 50, method: 'pix', coverFees: true });
    expect(resumo.total).toBe(50.6);
    expect(resumo.fee).toBe(0.6);
  });

  it('soma percentual e valor fixo do cartao de modo que a oferta chegue inteira', () => {
    const resumo = calcularDoacao({ amount: 100, method: 'credit_card', coverFees: true });
    expect(resumo.total).toBe(104.56);
    expect(resumo.fee).toBe(4.56);
    const stripeFee = resumo.total * 0.0399 + 0.39;
    expect(resumo.total - stripeFee).toBeCloseTo(100, 1);
  });

  it('recusa valores fora dos limites e meio desconhecido', () => {
    expect(() => calcularDoacao({ amount: LIMITES.min - 0.01, method: 'pix' })).toThrow(/Valor da doacao/);
    expect(() => calcularDoacao({ amount: LIMITES.max + 1, method: 'pix' })).toThrow(/Valor da doacao/);
    expect(() => calcularDoacao({ amount: Number.NaN, method: 'pix' })).toThrow(/Valor da doacao/);
    expect(() => calcularDoacao({ amount: 50, method: 'boleto' })).toThrow(/Meio de pagamento/);
  });
});

describe('destinos e configuracao publica', () => {
  it('expõe destinos, valores sugeridos, limites e tarifas', () => {
    const config = configPublica();
    expect(config.destinos.map((destino) => destino.id)).toEqual(['dizimo', 'obras', 'pastoral-social', 'onde-mais-precisar']);
    expect(config.valoresSugeridos).toEqual([20, 50, 100, 200]);
    expect(config.tarifas.credit_card).toEqual({ percentage: 3.99, fixed: 0.39 });
    expect(destinoPorId('obras').label).toBe('Obras da Matriz');
    expect(destinoPorId('inexistente')).toBeNull();
  });

  it('gera codigo de doacao no formato esperado', () => {
    expect(novaDoacaoId()).toMatch(/^DOA_[a-f0-9]{24}$/);
  });
});

describe('token de gerenciamento da doacao mensal', () => {
  beforeEach(() => { process.env.DOWNLOAD_JWT_SECRET = 'segredo-de-teste'; });
  afterEach(() => { delete process.env.DOWNLOAD_JWT_SECRET; });

  it('assina e le a assinatura', () => {
    const token = criarTokenAssinatura('sub_123');
    expect(lerTokenAssinatura(token)).toBe('sub_123');
  });

  it('recusa token adulterado, de outro proposito ou expirado', () => {
    const token = criarTokenAssinatura('sub_123');
    expect(lerTokenAssinatura(`${token}x`)).toBeNull();
    expect(lerTokenAssinatura(signToken({ downloadId: 'DL_1', exp: Date.now() + 1000 }, 'segredo-de-teste'))).toBeNull();
    expect(lerTokenAssinatura(signToken({ purpose: 'doacao-assinatura', subscriptionId: 'sub_1', exp: Date.now() - 1 }, 'segredo-de-teste'))).toBeNull();
  });

  it('nao gera link sem segredo configurado', () => {
    delete process.env.DOWNLOAD_JWT_SECRET;
    expect(criarTokenAssinatura('sub_123')).toBe('');
    expect(lerTokenAssinatura('qualquer')).toBeNull();
  });
});
