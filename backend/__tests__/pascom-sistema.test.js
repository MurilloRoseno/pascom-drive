jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, _res, next) => {
    req.auth = () => ({ userId: global.__clerkUserId || null });
    next();
  }),
  getAuth: jest.fn((req) => req.auth()),
  clerkClient: { users: { getUser: jest.fn() } },
}));

jest.mock('../lib/google-sheets.shared', () => ({
  ...jest.requireActual('../lib/google-sheets.shared'),
  rows: jest.fn(),
  sheet: jest.fn(),
}));

const request = require('supertest');
const { clerkClient } = require('@clerk/express');
const shared = require('../lib/google-sheets.shared');
const { VERSAO_WEBAPP_ESPERADA } = require('../lib/apps-script-client');
const app = require('../server');

function row(data) {
  return { get: (key) => data[key] };
}

const GB = 1024 ** 3;
let tabelas;
let abas;

function appsScriptResponde(body) {
  global.fetch.mockResolvedValueOnce({ text: async () => JSON.stringify(body) });
}

function diagnostico(overrides = {}) {
  return {
    versao: VERSAO_WEBAPP_ESPERADA,
    gatilho: true,
    ultimaExecucao: { fim: new Date().toISOString(), resultado: 'ok' },
    lock: null,
    propriedades: { ADMIN_EMAIL: { presente: true, obrigatoria: false } },
    pastas: { origem: 'ok', originais: 'ok', previas: 'ok', miniaturas: 'ok' },
    quarentena: [{ nome: '_ERRO_crisma__2026-06-01__turma_202606011200', desde: '2026-06-01T12:00:00Z' }],
    enviando: { quantidade: 0, maisAntigo: null },
    armazenamento: {
      usado: 13 * GB, limite: 15 * GB, livre: 2 * GB,
      pastas: { calculadoEm: '2026-09-19T10:00:00Z', completo: true, pastas: { originais: { bytes: 4 * GB }, previas: { bytes: GB } } },
    },
    ...overrides,
  };
}

const SEGREDOS = {
  CLERK_SECRET_KEY: 'sk_test_123', UPLOAD_WEBAPP_URL: 'https://script.google.com/macros/s/abc/exec',
  APPS_SCRIPT_HMAC_SECRET: 'segredo-hmac-nao-vaza', MP_ACCESS_TOKEN: 'APP_USR-nao-vaza',
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  Object.assign(process.env, SEGREDOS);
  global.__clerkUserId = 'user_123';
  clerkClient.users.getUser.mockResolvedValue({
    fullName: 'Equipe', emailAddresses: [{ emailAddress: 'pascom@paroquia.test' }], phoneNumbers: [],
  });
  abas = new Set(['Eventos', 'Fotos', 'Pedidos', 'ItensPedido', 'Webhooks', 'Downloads', 'RegrasPagamento', 'EquipePascom', 'Cupons', 'Pacotes']);
  tabelas = {
    EquipePascom: [row({ Identificador: 'pascom@paroquia.test', Tipo: 'email', Nome: 'Pascom', Role: 'admin', Ativo: 'SIM' })],
    Eventos: [
      row({ EventoID: 'EV1', Titulo: 'Crisma', StatusProcessamento: 'Processado', Publicacao: 'publicado' }),
      row({ EventoID: 'EV2', Titulo: 'Batismo', StatusProcessamento: 'Processado', Publicacao: 'arquivado', DataEvento: '2026-05-10', TotalFotos: 80 }),
      row({ EventoID: 'EV3', Titulo: 'Antigo', StatusProcessamento: 'Processado', Publicacao: 'arquivado', EspacoLiberacao: 'concluida', EspacoLiberadoBytes: 900 }),
      row({ EventoID: 'EV4', Titulo: 'Falhou', StatusProcessamento: 'Erro', Publicacao: 'rascunho' }),
    ],
  };
  shared.rows.mockImplementation(async (name) => tabelas[name] || []);
  shared.sheet.mockImplementation(async (name) => (abas.has(name) ? {} : null));
});

afterEach(() => {
  Object.keys(SEGREDOS).forEach((key) => delete process.env[key]);
});

it('exige sessao e membro ativo', async () => {
  global.__clerkUserId = null;
  expect((await request(app).get('/api/pascom/sistema')).status).toBe(401);
  global.__clerkUserId = 'user_123';
  tabelas.EquipePascom = [];
  expect((await request(app).get('/api/pascom/sistema')).status).toBe(403);
});

it('junta ambiente, planilha e Apps Script sem vazar segredos', async () => {
  const webhookOriginal = process.env.MP_WEBHOOK_SECRET;
  delete process.env.MP_WEBHOOK_SECRET;
  appsScriptResponde({ ok: true, data: diagnostico() });
  const response = await request(app).get('/api/pascom/sistema');
  if (webhookOriginal !== undefined) process.env.MP_WEBHOOK_SECRET = webhookOriginal;
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toContain('no-store');
  const itens = Object.fromEntries(response.body.itens.map((i) => [i.id, i]));
  expect(itens.mp_token.estado).toBe('ok');
  expect(itens.mp_webhook.estado).toBe('erro');
  expect(itens.webapp.estado).toBe('ok');
  expect(itens.espaco.estado).toBe('aviso');
  expect(itens.quarentena.estado).toBe('aviso');
  expect(itens.eventos_erro.estado).toBe('aviso');
  expect(response.body.resumo.erros).toBeGreaterThan(0);
  expect(response.body.armazenamento).toEqual(expect.objectContaining({
    usado: 13 * GB, eventosAtivos: 2, mediaPorEvento: Math.round((5 * GB) / 2), cabemEventos: 0,
  }));
  expect(response.body.arquivados.map((e) => e.eventoId)).toEqual(['EV2', 'EV3']);
  expect(response.body.quarentena).toHaveLength(1);

  const body = JSON.stringify(response.body);
  expect(body).not.toContain('segredo-hmac-nao-vaza');
  expect(body).not.toContain('APP_USR-nao-vaza');

  const envelope = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(envelope.acao).toBe('diagnostico');
});

it('Apps Script fora do ar vira item de erro, nao 500', async () => {
  global.fetch.mockRejectedValueOnce(new Error('network'));
  const response = await request(app).get('/api/pascom/sistema');
  expect(response.status).toBe(200);
  expect(response.body.appsScriptDisponivel).toBe(false);
  expect(response.body.itens.find((i) => i.id === 'webapp')).toEqual(expect.objectContaining({ estado: 'erro' }));
  expect(response.body.armazenamento).toBeNull();
});

it('Web App antigo e reconhecido pela acao desconhecida', async () => {
  appsScriptResponde({ ok: false, codigo: 'acao_invalida', error: 'Acao desconhecida.' });
  const response = await request(app).get('/api/pascom/sistema');
  expect(response.body.itens.find((i) => i.id === 'webapp').orientacao).toMatch(/versão antiga/);
});

it('planilha inacessivel aparece no checklist', async () => {
  shared.sheet.mockRejectedValue(new Error('permission denied'));
  appsScriptResponde({ ok: true, data: diagnostico() });
  const response = await request(app).get('/api/pascom/sistema');
  expect(response.status).toBe(200);
  expect(response.body.itens.find((i) => i.id === 'planilha_acesso').estado).toBe('erro');
});

it('estima a liberacao pelo Apps Script e repassa regra de negocio como 409', async () => {
  appsScriptResponde({ ok: true, data: { arquivos: 8, bytesLiberados: 2600 } });
  const ok = await request(app).get('/api/pascom/eventos/EV2/liberacao');
  expect(ok.status).toBe(200);
  expect(ok.body).toEqual({ arquivos: 8, bytesLiberados: 2600 });
  expect(JSON.parse(JSON.parse(global.fetch.mock.calls[0][1].body).payload)).toEqual({ eventoId: 'EV2' });

  appsScriptResponde({ ok: false, codigo: 'regra_negocio', error: 'Arquive o evento antes de liberar espaco.' });
  const recusado = await request(app).get('/api/pascom/eventos/EV1/liberacao');
  expect(recusado.status).toBe(409);
});

it('aceita liberarEspaco na rota de acoes de evento', async () => {
  appsScriptResponde({ ok: true, data: { situacao: 'concluida', arquivos: 3 } });
  const response = await request(app).post('/api/pascom/eventos/EV2/acoes').send({ acao: 'liberarEspaco' });
  expect(response.status).toBe(200);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).acao).toBe('liberarEspaco');
  expect(response.body.liberacao).toEqual({ situacao: 'concluida', arquivos: 3 });
});

it('reprocessa e corrige o nome de pastas em quarentena validando a pasta e os dados', async () => {
  appsScriptResponde({ ok: true, data: { nomePasta: 'crisma__2026-06-01__turma', devolvidas: 2 } });
  const ok = await request(app).post('/api/pascom/quarentena/1AbCdEfGhIjK/reprocessar');
  expect(ok.status).toBe(200);
  expect(ok.body).toEqual({ nomePasta: 'crisma__2026-06-01__turma', devolvidas: 2 });
  const envelope = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(envelope.acao).toBe('reprocessarPasta');
  expect(JSON.parse(envelope.payload)).toEqual({ folderId: '1AbCdEfGhIjK', quem: 'pascom@paroquia.test' });

  expect((await request(app).post('/api/pascom/quarentena/x/reprocessar')).status).toBe(400);
  const invalido = await request(app).post('/api/pascom/quarentena/1AbCdEfGhIjK/nome').send({ categoria: 'festa', data: '2026-06-01', titulo: 'Turma' });
  expect(invalido.status).toBe(400);

  appsScriptResponde({ ok: true, data: { nomePasta: 'crisma__2026-06-01__turma-da-tarde' } });
  const nome = await request(app).post('/api/pascom/quarentena/1AbCdEfGhIjK/nome')
    .send({ categoria: 'crisma', data: '2026-06-01', titulo: 'Turma da Tarde' });
  expect(nome.status).toBe(200);
  expect(JSON.parse(JSON.parse(global.fetch.mock.calls[1][1].body).payload)).toEqual({
    categoria: 'crisma', data: '2026-06-01', titulo: 'Turma da Tarde', folderId: '1AbCdEfGhIjK', quem: 'pascom@paroquia.test',
  });
});
