jest.mock('../lib/config-store', () => ({
  ...jest.requireActual('../lib/config-store'),
  lerConfig: jest.fn(),
}));
jest.mock('../lib/modulos', () => ({ lerModulos: jest.fn() }));
jest.mock('../lib/home', () => ({ homePublica: jest.fn() }));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const handler = require('../api/site');
const { lerConfig, DEFAULTS } = require('../lib/config-store');
const { lerModulos } = require('../lib/modulos');
const { homePublica } = require('../lib/home');

const app = express();
app.all('/api/site', handler);
app.use(errorHandler);

beforeEach(() => {
  jest.clearAllMocks();
  lerConfig.mockResolvedValue({
    ...DEFAULTS, precoFoto: 7.5, taxaServico: 2, taxaComodidade: 1, whatsapp: '5599988887777', tarifaCartaoPct: 3.99, tarifaPixPct: 1.19,
  });
  lerModulos.mockResolvedValue({
    busca: { ligado: true, efetivo: true, recado: 'a' },
    checkout: { ligado: true, efetivo: false, recado: 'Vendas pausadas.', caiCom: 'Busca e galerias' },
  });
  homePublica.mockResolvedValue({ blocos: [{ id: 'categorias', titulo: 'Sacramentos' }], destaque: null });
});

describe('GET /api/site', () => {
  it('devolve identidade, contato, home, módulos no ar e o preço que o checkout cobra', async () => {
    const r = await request(app).get('/api/site');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      nome: 'Paróquia São Rafael',
      whatsapp: '5599988887777',
      assistenteAtivo: true,
      home: { blocos: [{ id: 'categorias', titulo: 'Sacramentos' }], destaque: null },
      precos: { foto: 7.5, taxaServico: 2, taxaComodidade: 1 },
      missao: null,
      numeros: [],
      depoimentos: [],
    });
    expect(r.body.modulos.checkout).toEqual({ ligado: false, recado: 'Vendas pausadas.' });
    expect(r.body.modulos.busca).toEqual({ ligado: true, recado: 'a' });
    expect(r.headers['cache-control']).toContain('max-age=60');
  });

  it('nunca expõe tarifas do gateway, segredos nem chaves internas de configuração', async () => {
    const texto = JSON.stringify((await request(app).get('/api/site')).body);
    expect(texto).not.toMatch(/tarifa|3\.99|1\.19|prazoPadrao|tarja|previaLargura|assistenteFonte|assistenteForaDoEscopo|homeBlocos|sk_|whsec/i);
  });

  it('só aceita GET', async () => {
    expect((await request(app).post('/api/site')).status).toBe(405);
  });

  it('erro interno vira 500 genérico, sem detalhe', async () => {
    lerConfig.mockRejectedValue(new Error('planilha caiu: chave secreta xyz'));
    const r = await request(app).get('/api/site');
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/planilha|xyz/);
  });
});
