jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true) }));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const router = require('../api/painel/acessos');
const acessos = require('../lib/acessos');
const equipe = require('../lib/equipe');
const { registrarAuditoria } = require('../lib/audit');
const { ErroNegocio } = require('../lib/erros');

const app = express();
app.use(express.json());
app.use('/api/pascom/acessos', router);
app.use(errorHandler);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });

beforeEach(() => {
  jest.clearAllMocks();
  acessos.listarMatriz.mockResolvedValue({ admin: ['agenda.ver'], coord: ['agenda.ver', 'agenda.criar'], foto: ['eventos.ver'], atend: [] });
  equipe.listarEquipe.mockResolvedValue([{ email: 'ana@p.org', nome: 'Ana', role: 'admin', ativo: true, fixo: false }]);
});

describe('/api/pascom/acessos — só o administrador', () => {
  it.each(['coord', 'foto', 'atend'])('%s recebe 403 em todas as rotas', async (papel) => {
    expect((await request(app).get('/api/pascom/acessos').set(como(papel))).status).toBe(403);
    expect((await request(app).put('/api/pascom/acessos/papeis/foto').set(como(papel)).send({ permissoes: ['pagamentos.editar'] })).status).toBe(403);
    expect((await request(app).post('/api/pascom/acessos/equipe').set(como(papel)).send({})).status).toBe(403);
    expect((await request(app).patch('/api/pascom/acessos/equipe/a@p.org').set(como(papel)).send({})).status).toBe(403);
    expect(acessos.salvarAcesso).not.toHaveBeenCalled();
    expect(equipe.adicionarMembro).not.toHaveBeenCalled();
  });

  it('sem login, 401', async () => {
    expect((await request(app).get('/api/pascom/acessos')).status).toBe(401);
  });

  it('GET devolve papéis, áreas, matriz, as permissões reservadas e a equipe', async () => {
    const r = await request(app).get('/api/pascom/acessos').set(como('admin'));
    expect(r.status).toBe(200);
    expect(r.body.papeis.map((p) => p.id)).toEqual(['admin', 'coord', 'foto', 'atend']);
    expect(r.body.areas.length).toBeGreaterThan(5);
    expect(r.body.protegidas).toEqual(['modulos.gerenciar', 'acessos.gerenciar']);
    expect(r.body.matriz.coord).toEqual(['agenda.ver', 'agenda.criar']);
    expect(r.body.equipe).toHaveLength(1);
  });
});

describe('PUT /papeis/:papel', () => {
  it('salva e a auditoria diz o que foi liberado e o que foi tirado', async () => {
    acessos.salvarAcesso.mockResolvedValue(['agenda.ver', 'eventos.ver']);
    const r = await request(app).put('/api/pascom/acessos/papeis/coord').set(como('admin')).send({ permissoes: ['agenda.ver', 'eventos.ver'] });
    expect(r.status).toBe(200);
    expect(acessos.salvarAcesso).toHaveBeenCalledWith('coord', ['agenda.ver', 'eventos.ver'], 'admin@pascom.org');
    expect(registrarAuditoria.mock.calls[0][0].mensagem).toBe('Acessos: Coordenação — liberou eventos.ver; tirou agenda.criar');
  });

  it('o servidor recusa mexer no administrador (mensagem do negócio)', async () => {
    acessos.salvarAcesso.mockRejectedValue(new ErroNegocio('O administrador sempre tem todas as permissões.'));
    const r = await request(app).put('/api/pascom/acessos/papeis/admin').set(como('admin')).send({ permissoes: [] });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('O administrador sempre tem todas as permissões.');
  });

  it.each([{}, { permissoes: 'tudo' }, { permissoes: [], extra: 1 }, { permissoes: Array(61).fill('a.ver') }])('corpo inválido %j dá 400', async (corpo) => {
    expect((await request(app).put('/api/pascom/acessos/papeis/coord').set(como('admin')).send(corpo)).status).toBe(400);
    expect(acessos.salvarAcesso).not.toHaveBeenCalled();
  });
});

describe('equipe', () => {
  it('adiciona e audita', async () => {
    equipe.adicionarMembro.mockResolvedValue({ email: 'carla@p.org', nome: 'Carla', role: 'atend', ativo: true });
    const r = await request(app).post('/api/pascom/acessos/equipe').set(como('admin')).send({ email: 'carla@p.org', nome: 'Carla', role: 'atend' });
    expect(r.status).toBe(201);
    expect(registrarAuditoria.mock.calls[0][0].mensagem).toBe('Equipe: carla@p.org adicionado como Atendimento');
  });

  it('altera papel e desativa, com auditoria; trava de último admin vem do negócio', async () => {
    equipe.atualizarMembro.mockResolvedValueOnce({ email: 'bia@p.org', role: 'coord', ativo: true });
    expect((await request(app).patch('/api/pascom/acessos/equipe/bia@p.org').set(como('admin')).send({ role: 'coord' })).status).toBe(200);
    expect(registrarAuditoria.mock.calls[0][0].mensagem).toBe('Equipe: bia@p.org agora é Coordenação');
    equipe.atualizarMembro.mockRejectedValueOnce(new ErroNegocio('Precisa existir ao menos um administrador ativo.'));
    const r = await request(app).patch('/api/pascom/acessos/equipe/ana@p.org').set(como('admin')).send({ ativo: false });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Precisa existir ao menos um administrador ativo.');
  });
});
