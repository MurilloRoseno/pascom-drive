jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/agenda', () => ({
  TIPOS: [{ id: 'missa', nome: 'Missa' }],
  listarCompromissos: jest.fn(), criarCompromisso: jest.fn(), atualizarCompromisso: jest.fn(),
  removerCompromisso: jest.fn(), ocorrenciasDoMes: jest.fn(), proximas: jest.fn(),
}));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true) }));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const publico = require('../api/agenda');
const painel = require('../api/painel/agenda');
const agenda = require('../lib/agenda');
const { registrarAuditoria } = require('../lib/audit');
const { ErroNegocio } = require('../lib/erros');

const app = express();
app.use(express.json());
app.all('/api/agenda', publico);
app.use('/api/pascom/agenda', painel);
app.use(errorHandler);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });

beforeEach(() => {
  jest.clearAllMocks();
  agenda.ocorrenciasDoMes.mockResolvedValue([{ id: 'a', titulo: 'Missa', data: '2026-10-04' }]);
  agenda.listarCompromissos.mockResolvedValue([{ id: 'a' }]);
});

describe('GET /api/agenda (pública)', () => {
  it('devolve as ocorrências do mês pedido, os tipos e o dia de hoje', async () => {
    const r = await request(app).get('/api/agenda?mes=2026-10');
    expect(r.status).toBe(200);
    expect(agenda.ocorrenciasDoMes).toHaveBeenCalledWith('2026-10');
    expect(r.body).toMatchObject({ mes: '2026-10', tipos: [{ id: 'missa', nome: 'Missa' }], ocorrencias: [{ id: 'a' }] });
    expect(r.body.hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.headers['cache-control']).toContain('max-age=60');
  });

  it('sem mês usa o mês de hoje', async () => {
    const r = await request(app).get('/api/agenda');
    expect(r.status).toBe(200);
    expect(r.body.mes).toMatch(/^\d{4}-\d{2}$/);
  });

  it.each(['2026-13', '2026-1', 'outubro', '2026-10-01', '../etc', '2026-00'])('mês inválido (%s) dá 400 sem consultar', async (mes) => {
    const r = await request(app).get(`/api/agenda?mes=${encodeURIComponent(mes)}`);
    expect(r.status).toBe(400);
    expect(agenda.ocorrenciasDoMes).not.toHaveBeenCalled();
  });

  it('mês repetido na query (array) também dá 400', async () => {
    expect((await request(app).get('/api/agenda?mes=2026-10&mes=2026-11')).status).toBe(400);
  });

  it('só aceita GET', async () => {
    expect((await request(app).post('/api/agenda')).status).toBe(405);
  });

  it('?proximas=N devolve os próximos N compromissos (bloco da página inicial)', async () => {
    agenda.proximas.mockResolvedValue([{ id: 'a', titulo: 'Missa', data: '2026-10-04' }]);
    const r = await request(app).get('/api/agenda?proximas=5');
    expect(r.status).toBe(200);
    expect(agenda.proximas).toHaveBeenCalledWith(5);
    expect(r.body.ocorrencias).toHaveLength(1);
    expect(agenda.ocorrenciasDoMes).not.toHaveBeenCalled();
  });

  it.each(['0', '21', 'abc', '2.5', '-1'])('proximas inválido (%s) dá 400', async (n) => {
    expect((await request(app).get(`/api/agenda?proximas=${n}`)).status).toBe(400);
    expect(agenda.proximas).not.toHaveBeenCalled();
  });
});

describe('/api/pascom/agenda', () => {
  it('lista ocorrências e compromissos para quem tem agenda.ver (atendimento sim, fotógrafo não)', async () => {
    const r = await request(app).get('/api/pascom/agenda?mes=2026-10').set(como('atend'));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ocorrencias: [{ id: 'a' }], compromissos: [{ id: 'a' }] });
    expect((await request(app).get('/api/pascom/agenda').set(como('foto'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/agenda')).status).toBe(401);
  });

  it('cria (atendimento pode), audita e devolve 201', async () => {
    agenda.criarCompromisso.mockResolvedValue({ id: 'n', titulo: 'Reunião', data: '2026-10-10' });
    const r = await request(app).post('/api/pascom/agenda').set(como('atend')).send({ titulo: 'Reunião', data: '2026-10-10', tipo: 'reuniao' });
    expect(r.status).toBe(201);
    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ mensagem: 'Agenda: «Reunião» adicionado em 2026-10-10' }));
  });

  it('erro de validação chega com a mensagem em português', async () => {
    agenda.criarCompromisso.mockRejectedValue(new ErroNegocio('Dê um título ao compromisso.'));
    const r = await request(app).post('/api/pascom/agenda').set(como('coord')).send({});
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Dê um título ao compromisso.');
  });

  it('edita e remove com as permissões certas: atendimento NÃO remove', async () => {
    agenda.atualizarCompromisso.mockResolvedValue({ id: 'a', titulo: 'Missa' });
    expect((await request(app).patch('/api/pascom/agenda/a').set(como('atend')).send({ local: 'Salão' })).status).toBe(200);
    expect(agenda.atualizarCompromisso).toHaveBeenCalledWith('a', { local: 'Salão' });
    expect((await request(app).delete('/api/pascom/agenda/a').set(como('atend'))).status).toBe(403);
    expect(agenda.removerCompromisso).not.toHaveBeenCalled();
    agenda.removerCompromisso.mockResolvedValue();
    expect((await request(app).delete('/api/pascom/agenda/a').set(como('coord'))).status).toBe(200);
  });

  it('compromisso inexistente: 404', async () => {
    agenda.atualizarCompromisso.mockRejectedValue(new ErroNegocio('Compromisso não encontrado.', 404));
    expect((await request(app).patch('/api/pascom/agenda/zzz').set(como('coord')).send({ local: 'x' })).status).toBe(404);
  });
});
