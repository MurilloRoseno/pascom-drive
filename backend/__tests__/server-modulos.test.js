// Integração com o server.js de verdade: com os módulos desligados, as rotas públicas de cada um
// respondem 503 com o recado ANTES de tocar na planilha; o que envolve dinheiro em trânsito
// (webhook, status, recuperar pedido e download) nunca é barrado.
jest.mock('../lib/modulos', () => ({
  ...jest.requireActual('../lib/modulos'),
  lerModulos: jest.fn(),
  moduloEfetivo: jest.fn().mockResolvedValue(true),
}));
jest.mock('../lib/categorias', () => ({ listarCategorias: jest.fn().mockResolvedValue([]) }));
jest.mock('../lib/agenda', () => ({
  TIPOS: [], ocorrenciasDoMes: jest.fn().mockResolvedValue([]), proximas: jest.fn().mockResolvedValue([]),
}));
jest.mock('../lib/faq', () => ({
  ...jest.requireActual('../lib/faq'),
  listarFaq: jest.fn().mockResolvedValue([]),
}));
jest.mock('../lib/config-store', () => ({
  ...jest.requireActual('../lib/config-store'),
  lerConfig: jest.fn(),
}));
// o assistente lê as galerias direto do catálogo
jest.mock('../lib/google-sheets.catalog', () => ({
  ...jest.requireActual('../lib/google-sheets.catalog'),
  listarEventosPublicados: jest.fn().mockResolvedValue([{ title: 'Evento X' }]),
}));

const request = require('supertest');
const { lerModulos, moduloEfetivo } = require('../lib/modulos');
const { lerConfig, DEFAULTS } = require('../lib/config-store');

const app = require('../server');

const ligado = { ligado: true, efetivo: true, recado: 'ok' };
const desligado = (recado) => ({ ligado: false, efetivo: false, recado });

beforeEach(() => {
  jest.clearAllMocks();
  moduloEfetivo.mockResolvedValue(true);
  lerConfig.mockResolvedValue({ ...DEFAULTS });
  lerModulos.mockResolvedValue({
    busca: desligado('Galerias em manutenção.'),
    checkout: desligado('Vendas pausadas.'),
    agenda: desligado('Agenda em manutenção.'),
    ajuda: desligado('Ajuda em manutenção.'),
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('rotas públicas com o módulo desligado', () => {
  it.each([
    ['GET', '/api/categorias', 'Galerias em manutenção.'],
    ['GET', '/api/eventos', 'Galerias em manutenção.'],
    ['GET', '/api/e/algum-evento', 'Galerias em manutenção.'],
    ['GET', '/api/eventos/EVT_1', 'Galerias em manutenção.'],
    ['GET', '/api/eventos/EVT_1/ofertas', 'Galerias em manutenção.'],
    ['GET', '/api/eventos/EVT_1/fotos', 'Galerias em manutenção.'],
    ['GET', '/api/eventos/EVT_1/previews/FOTO_1', 'Galerias em manutenção.'],
    ['POST', '/api/eventos/EVT_1/acesso', 'Galerias em manutenção.'],
    ['POST', '/api/checkout/quote', 'Vendas pausadas.'],
    ['POST', '/api/checkout/preference', 'Vendas pausadas.'],
    ['POST', '/api/criar-pagamento', 'Vendas pausadas.'],
    ['GET', '/api/agenda', 'Agenda em manutenção.'],
    ['GET', '/api/faq', 'Ajuda em manutenção.'],
    ['POST', '/api/assistente', 'Ajuda em manutenção.'],
  ])('%s %s responde 503 com o recado', async (metodo, rota, recado) => {
    const r = await request(app)[metodo.toLowerCase()](rota).send({});
    expect(r.status).toBe(503);
    expect(r.body.error).toBe(recado);
  });

  it('desligar só a busca também barra a compra (dependência)', async () => {
    lerModulos.mockResolvedValue({
      busca: desligado('Galerias em manutenção.'),
      checkout: {
        ligado: true, efetivo: false, recado: 'Vendas liberadas.', caiCom: 'Busca e galerias',
      },
      agenda: ligado,
      ajuda: ligado,
    });
    expect((await request(app).post('/api/checkout/quote').send({})).status).toBe(503);
  });

  it('com tudo ligado as rotas respondem normalmente', async () => {
    lerModulos.mockResolvedValue({
      busca: ligado, checkout: ligado, agenda: ligado, ajuda: ligado,
    });
    expect((await request(app).get('/api/agenda')).status).toBe(200);
    expect((await request(app).get('/api/faq')).status).toBe(200);
    expect((await request(app).get('/api/categorias')).status).toBe(200);
  });
});

describe('o que envolve dinheiro em trânsito nunca é barrado', () => {
  it.each([
    ['GET', '/api/status-pagamento?pedidoId=PED_inexistente'],
    ['POST', '/api/pedidos/recuperar'],
    ['GET', '/api/download?token=invalido'],
    ['POST', '/api/webhook/stripe'],
    ['POST', '/api/webhook/mercado-pago'],
    ['GET', '/api/health'],
  ])('%s %s não vira 503 de módulo', async (metodo, rota) => {
    const r = await request(app)[metodo.toLowerCase()](rota).send({});
    expect(r.body && r.body.modulo).toBeUndefined();
    expect(r.status).not.toBe(503);
  });

  it('o painel e o login da equipe continuam respondendo (401 sem login, não 503)', async () => {
    const r = await request(app).get('/api/pascom/me');
    expect(r.status).not.toBe(503);
  });
});

describe('assistente com agenda ou galerias fora do ar', () => {
  it('não consulta a agenda nem os eventos quando o módulo está desligado', async () => {
    lerModulos.mockResolvedValue({
      busca: ligado, checkout: ligado, agenda: ligado, ajuda: ligado,
    });
    moduloEfetivo.mockImplementation(async (chave) => !['agenda', 'busca'].includes(chave));
    const { proximas } = require('../lib/agenda');
    const { listarEventosPublicados } = require('../lib/google-sheets.catalog');
    await request(app).post('/api/assistente').send({ mensagem: 'Quando é a próxima missa?' });
    await request(app).post('/api/assistente').send({ mensagem: 'Quais eventos estão disponíveis?' });
    expect(proximas).not.toHaveBeenCalled();
    expect(listarEventosPublicados).not.toHaveBeenCalled();

    // contraprova: com os módulos ligados as duas fontes são consultadas
    moduloEfetivo.mockResolvedValue(true);
    await request(app).post('/api/assistente').send({ mensagem: 'Quando é a próxima missa?' });
    await request(app).post('/api/assistente').send({ mensagem: 'Quais eventos estão disponíveis?' });
    expect(proximas).toHaveBeenCalled();
    expect(listarEventosPublicados).toHaveBeenCalled();
  });
});
