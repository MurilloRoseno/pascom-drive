jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/config-store', () => ({ lerConfig: jest.fn(), salvarConfig: jest.fn(), CAMPOS: {} }));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true), ultimasAlteracoes: jest.fn() }));
jest.mock('../lib/categorias', () => ({}));
jest.mock('../lib/eventos-admin', () => ({}));
jest.mock('../lib/tarifas', () => ({ precosBase: jest.fn(), regrasPagamento: jest.fn() }));

const request = require('supertest');
const express = require('express');
const router = require('../api/painel');
const { precosBase, regrasPagamento } = require('../lib/tarifas');
const { calculatePricing } = require('../lib/pricing');

const app = express();
app.use(express.json());
app.use('/api/pascom', router);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });
const BASE = { unitPrice: 5, serviceFee: 2, convenienceFee: 1 };
const REGRAS = [{ method: 'pix', percentage: 1.19, fixed: 0 }, { method: 'credit_card', percentage: 3.99, fixed: 0.39 }];

const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  precosBase.mockResolvedValue(BASE);
  regrasPagamento.mockResolvedValue(REGRAS);
});
afterAll(() => { process.env = ENV; });

describe('GET /api/pascom/pagamentos/simulador', () => {
  it('usa a mesma conta do checkout e mostra quanto a paróquia recebe líquido', async () => {
    const r = await request(app).get('/api/pascom/pagamentos/simulador?quantidade=2').set(como('admin'));
    expect(r.status).toBe(200);
    const igual = calculatePricing(2, 'credit_card', REGRAS, {}, BASE);
    expect(r.body.atual.cartao).toMatchObject({
      quantidade: 2, precoUnitario: 5, subtotal: 10, taxaServico: 2, taxaComodidade: 1, custoPagamento: igual.paymentCost, total: igual.total,
    });
    // a tarifa retida pela Stripe sobre o total cobrado deixa a paróquia com os R$ 13,00 (foto + taxas)
    expect(r.body.atual.cartao.liquido).toBeCloseTo(13, 1);
    expect(r.body.atual.pix.liquido).toBeCloseTo(13, 1);
    expect(r.body.atual.pix.total).toBeLessThan(r.body.atual.cartao.total);
  });

  it('traz a tabela por quantidade (1, 3, 5, 10) com o acréscimo do cartão', async () => {
    const r = await request(app).get('/api/pascom/pagamentos/simulador?quantidade=1').set(como('coord'));
    expect(r.body.tabela.map((l) => l.quantidade)).toEqual([1, 3, 5, 10]);
    expect(r.body.tabela[0].acrescimoCartaoPercentual).toBeGreaterThan(r.body.tabela[3].acrescimoCartaoPercentual);
  });

  it.each(['0', '101', 'abc', '2.5', '-1', ''])('quantidade "%s" é recusada com mensagem clara', async (q) => {
    const r = await request(app).get(`/api/pascom/pagamentos/simulador?quantidade=${q}`).set(como('admin'));
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Escolha de 1 a 100 fotos.');
  });

  it('aceita o limite de 100 fotos', async () => {
    expect((await request(app).get('/api/pascom/pagamentos/simulador?quantidade=100').set(como('admin'))).status).toBe(200);
  });

  it('fotógrafo e atendimento não veem pagamentos (pagamentos.ver); sem login, 401', async () => {
    expect((await request(app).get('/api/pascom/pagamentos/simulador?quantidade=1').set(como('foto'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/pagamentos/simulador?quantidade=1').set(como('atend'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/pagamentos/simulador?quantidade=1')).status).toBe(401);
  });

  it('falha ao ler a configuração vira erro genérico, sem vazar detalhe', async () => {
    precosBase.mockRejectedValue(new Error('chave privada xyz'));
    const r = await request(app).get('/api/pascom/pagamentos/simulador?quantidade=1').set(como('admin'));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/xyz/);
  });
});

describe('GET /api/pascom/pagamentos/estado', () => {
  const limpar = () => ['PAYMENT_GATEWAY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'DOWNLOAD_JWT_SECRET', 'FORENSIC_WATERMARK_SECRET'].forEach((k) => delete process.env[k]);

  it('diz o que está configurado, nunca o valor dos segredos', async () => {
    limpar();
    process.env.PAYMENT_GATEWAY = 'stripe';
    process.env.STRIPE_SECRET_KEY = 'sk_test_SEGREDINHO_QUE_NAO_PODE_VAZAR';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_OUTRO_SEGREDO';
    process.env.DOWNLOAD_JWT_SECRET = 'a'.repeat(64);
    const r = await request(app).get('/api/pascom/pagamentos/estado').set(como('admin'));
    expect(r.body).toEqual({
      gateway: 'stripe',
      gatewayDefinido: true,
      stripe: { chaveSecreta: true, segredoWebhook: true, modo: 'teste' },
      segredos: { download: true, marcaForense: false },
    });
    expect(JSON.stringify(r.body)).not.toMatch(/SEGREDINHO|OUTRO_SEGREDO|aaaa/);
  });

  it('sem nada configurado: Mercado Pago como padrão e tudo faltando', async () => {
    limpar();
    const r = await request(app).get('/api/pascom/pagamentos/estado').set(como('admin'));
    expect(r.body).toMatchObject({
      gateway: 'mercadopago', gatewayDefinido: false, stripe: { chaveSecreta: false, segredoWebhook: false, modo: null },
    });
  });

  it('chave de produção é identificada como tal', async () => {
    limpar();
    process.env.STRIPE_SECRET_KEY = 'sk_live_xxx';
    expect((await request(app).get('/api/pascom/pagamentos/estado').set(como('admin'))).body.stripe.modo).toBe('producao');
  });

  it('segredo curto não conta como configurado', async () => {
    limpar();
    process.env.DOWNLOAD_JWT_SECRET = 'curto';
    expect((await request(app).get('/api/pascom/pagamentos/estado').set(como('admin'))).body.segredos.download).toBe(false);
  });

  it('só quem tem pagamentos.ver', async () => {
    expect((await request(app).get('/api/pascom/pagamentos/estado').set(como('atend'))).status).toBe(403);
  });
});
