jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, _res, next) => {
    req.auth = () => ({ userId: global.__userId || null, sessionClaims: global.__claims });
    next();
  }),
  getAuth: jest.fn((req) => req.auth()),
  clerkClient: { users: { getUser: jest.fn() } },
}));
jest.mock('../lib/google-sheets.shared', () => ({
  rows: jest.fn(),
  yes: jest.requireActual('../lib/google-sheets.shared').yes,
}));
jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue() }));

const request = require('supertest');
const express = require('express');
const { clerkClient } = require('@clerk/express');
const { rows } = require('../lib/google-sheets.shared');
const { garantirMatriz } = require('../lib/acessos');
const { authenticatePascom, pascomClerkMiddleware } = require('../lib/pascom-auth');
const { exigirPermissao } = require('../lib/pascom-permissoes');

process.env.CLERK_SECRET_KEY = 'sk_test_x';

function criarApp(permissao) {
  const app = express();
  app.use('/api/pascom', pascomClerkMiddleware(), authenticatePascom);
  app.get('/api/pascom/teste', exigirPermissao(permissao), (req, res) => res.json({ membro: req.membro, sessao: req.sessao }));
  return app;
}

const linha = (dados) => ({ get: (k) => dados[k], set: jest.fn(), save: jest.fn().mockResolvedValue() });
const usuario = (email) => ({ emailAddresses: [{ emailAddress: email }], phoneNumbers: [] });
const ENV = process.env.PAINEL_ADMIN_EMAIL;

beforeEach(() => {
  jest.clearAllMocks();
  garantirMatriz.mockResolvedValue();
  delete process.env.PAINEL_ADMIN_EMAIL;
  global.__userId = 'user_1';
  global.__claims = { fva: [3, -1] };
  rows.mockResolvedValue([]);
});
afterAll(() => {
  if (ENV === undefined) delete process.env.PAINEL_ADMIN_EMAIL; else process.env.PAINEL_ADMIN_EMAIL = ENV;
});

describe('authenticatePascom + papel do painel', () => {
  it('PAINEL_ADMIN_EMAIL entra como admin mesmo com a EquipePascom vazia', async () => {
    process.env.PAINEL_ADMIN_EMAIL = 'dono@p.org';
    clerkClient.users.getUser.mockResolvedValue(usuario('Dono@P.org'));
    const r = await request(criarApp('acessos.gerenciar')).get('/api/pascom/teste');
    expect(r.status).toBe(200);
    expect(r.body.membro).toEqual({ email: 'dono@p.org', nome: 'Administrador', role: 'admin' });
    expect(r.body.sessao).toEqual({ fva: [3, -1] });
  });

  it('e-mail fora da equipe: 403, como já era', async () => {
    clerkClient.users.getUser.mockResolvedValue(usuario('estranho@p.org'));
    expect((await request(criarApp()).get('/api/pascom/teste')).status).toBe(403);
  });

  it('sem sessão: 401', async () => {
    global.__userId = null;
    expect((await request(criarApp()).get('/api/pascom/teste')).status).toBe(401);
  });

  it('membro da planilha com papel do painel passa e leva o papel', async () => {
    rows.mockResolvedValue([linha({ Identificador: 'ana@p.org', Tipo: 'email', Nome: 'Ana', Role: 'Coord', Ativo: 'SIM' })]);
    clerkClient.users.getUser.mockResolvedValue(usuario('ana@p.org'));
    const r = await request(criarApp('eventos.editar')).get('/api/pascom/teste');
    expect(r.status).toBe(200);
    expect(r.body.membro).toMatchObject({ email: 'ana@p.org', nome: 'Ana', role: 'coord' });
  });
});

describe('exigirPermissao', () => {
  beforeEach(() => {
    rows.mockResolvedValue([linha({ Identificador: 'bia@p.org', Tipo: 'email', Nome: 'Bia', Role: 'foto', Ativo: 'SIM' })]);
    clerkClient.users.getUser.mockResolvedValue(usuario('bia@p.org'));
  });

  it('papel sem a permissão recebe 403', async () => {
    const r = await request(criarApp('pagamentos.editar')).get('/api/pascom/teste');
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('Sem permissão para esta ação');
  });

  it('papel com a permissão passa', async () => {
    expect((await request(criarApp('envio.criar')).get('/api/pascom/teste')).status).toBe(200);
  });

  it('papel em branco ou desconhecido na planilha não tem permissão nenhuma no painel', async () => {
    rows.mockResolvedValue([linha({ Identificador: 'bia@p.org', Tipo: 'email', Nome: 'Bia', Role: 'gerente', Ativo: 'SIM' })]);
    expect((await request(criarApp('eventos.ver')).get('/api/pascom/teste')).status).toBe(403);
    rows.mockResolvedValue([linha({ Identificador: 'bia@p.org', Tipo: 'email', Nome: 'Bia', Role: '', Ativo: 'SIM' })]);
    expect((await request(criarApp('eventos.ver')).get('/api/pascom/teste')).status).toBe(403);
  });

  it('sem permissão pedida, basta estar na equipe', async () => {
    expect((await request(criarApp()).get('/api/pascom/teste')).status).toBe(200);
  });

  it('se a matriz de acessos não puder ser lida, nega (503) em vez de cair no padrão', async () => {
    garantirMatriz.mockRejectedValue(new Error('planilha fora do ar'));
    const r = await request(criarApp('envio.criar')).get('/api/pascom/teste');
    expect(r.status).toBe(503);
    expect(JSON.stringify(r.body)).not.toMatch(/planilha fora/);
  });
});
