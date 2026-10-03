jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/home', () => ({
  ...jest.requireActual('../lib/home'),
  lerHome: jest.fn(),
  salvarHome: jest.fn(),
}));
jest.mock('../lib/modulos', () => ({ lerModulos: jest.fn() }));
jest.mock('../lib/eventos-admin', () => ({ listarEventosAdmin: jest.fn(), atualizarPublicacao: jest.fn(), atualizarCategoriaEvento: jest.fn() }));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true), ultimasAlteracoes: jest.fn() }));

const request = require('supertest');
const express = require('express');
const router = require('../api/painel');
const { lerHome, salvarHome, BLOCOS_PADRAO } = require('../lib/home');
const { lerModulos } = require('../lib/modulos');
const { listarEventosAdmin } = require('../lib/eventos-admin');
const { registrarAuditoria } = require('../lib/audit');
const { ErroNegocio } = require('../lib/erros');

const app = express();
app.use(express.json());
app.use('/api/pascom', router);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });

beforeEach(() => {
  jest.clearAllMocks();
  lerHome.mockResolvedValue({ blocos: BLOCOS_PADRAO, destaque: '' });
  lerModulos.mockResolvedValue({ busca: { efetivo: false }, checkout: { efetivo: true }, agenda: { efetivo: true }, ajuda: { efetivo: true } });
  listarEventosAdmin.mockResolvedValue([
    { eventoId: 'A', nome: 'Missa', estado: 'no_ar' },
    { eventoId: 'B', nome: 'Rascunho', estado: 'rascunho' },
  ]);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/pascom/home', () => {
  it('devolve os blocos, de que módulo cada um depende (e se está no ar) e só eventos no ar', async () => {
    const r = await request(app).get('/api/pascom/home').set(como('coord'));
    expect(r.status).toBe(200);
    expect(r.body.blocos).toHaveLength(BLOCOS_PADRAO.length);
    expect(r.body.info.eventos).toEqual({ modulo: 'busca', noAr: false, so: null });
    expect(r.body.info.agenda).toEqual({ modulo: 'agenda', noAr: true, so: null });
    expect(r.body.info.missao).toEqual({ modulo: null, noAr: true, so: 'desktop' });
    expect(r.body.eventosNoAr).toEqual([{ eventoId: 'A', nome: 'Missa' }]);
  });

  it('quem não tem conteudo.ver não entra (fotógrafo, atendimento); sem login, 401', async () => {
    expect((await request(app).get('/api/pascom/home').set(como('foto'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/home').set(como('atend'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/home')).status).toBe(401);
  });
});

describe('PUT /api/pascom/home', () => {
  const corpo = () => ({ blocos: BLOCOS_PADRAO.map((b) => ({ ...b })), destaque: 'A' });

  it('publica e audita', async () => {
    salvarHome.mockResolvedValue(corpo());
    const r = await request(app).put('/api/pascom/home').set(como('coord')).send(corpo());
    expect(r.status).toBe(200);
    expect(salvarHome).toHaveBeenCalledWith(corpo(), 'coord@pascom.org');
    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ mensagem: 'Página inicial publicada (ordem, títulos e destaque)' }));
  });

  it('sem conteudo.editar, 403 e nada é salvo', async () => {
    expect((await request(app).put('/api/pascom/home').set(como('foto')).send(corpo())).status).toBe(403);
    expect(salvarHome).not.toHaveBeenCalled();
  });

  it('destaque fora do ar chega como erro em português', async () => {
    salvarHome.mockRejectedValue(new ErroNegocio('Escolha um evento que esteja no ar.'));
    const r = await request(app).put('/api/pascom/home').set(como('admin')).send({ ...corpo(), destaque: 'B' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Escolha um evento que esteja no ar.');
    expect(registrarAuditoria).not.toHaveBeenCalled();
  });
});

describe('módulos no painel', () => {
  it('só o administrador vê e muda módulos (coordenação não)', async () => {
    expect((await request(app).get('/api/pascom/modulos').set(como('coord'))).status).toBe(403);
    expect((await request(app).put('/api/pascom/modulos/agenda').set(como('coord')).send({ ligado: false })).status).toBe(403);
  });
});
