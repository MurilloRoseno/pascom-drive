jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/conteudo', () => ({ lerConteudo: jest.fn(), publicarConteudo: jest.fn() }));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true), ultimasAlteracoes: jest.fn() }));

const request = require('supertest');
const express = require('express');
const router = require('../api/painel');
const { lerConteudo, publicarConteudo } = require('../lib/conteudo');
const { registrarAuditoria } = require('../lib/audit');
const { ErroNegocio } = require('../lib/erros');

const app = express();
app.use(express.json());
app.use('/api/pascom', router);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });

beforeEach(() => {
  jest.clearAllMocks();
  lerConteudo.mockResolvedValue({ nome: 'Paróquia São Rafael', missao: null, numeros: [], depoimentos: [] });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/pascom/conteudo', () => {
  it('coordenação lê; fotógrafo e atendimento não (sem conteudo.ver); sem login, 401', async () => {
    expect((await request(app).get('/api/pascom/conteudo').set(como('coord'))).status).toBe(200);
    expect((await request(app).get('/api/pascom/conteudo').set(como('foto'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/conteudo').set(como('atend'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/conteudo')).status).toBe(401);
  });
});

describe('PUT /api/pascom/conteudo', () => {
  it('publica, audita os campos e devolve o conteúdo atualizado', async () => {
    publicarConteudo.mockResolvedValue({ alterados: ['Nome', 'Horário'] });
    const r = await request(app).put('/api/pascom/conteudo').set(como('coord')).send({ nome: 'Paróquia X', horario: '8h' });
    expect(r.status).toBe(200);
    expect(publicarConteudo).toHaveBeenCalledWith({ nome: 'Paróquia X', horario: '8h' }, 'coord@pascom.org');
    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ mensagem: 'Conteúdo do site publicado: Nome, Horário' }));
    expect(r.body.alterados).toEqual(['Nome', 'Horário']);
    expect(r.body.conteudo.nome).toBe('Paróquia São Rafael');
  });

  it('só quem tem conteudo.editar publica', async () => {
    expect((await request(app).put('/api/pascom/conteudo').set(como('foto')).send({ nome: 'X' })).status).toBe(403);
    expect((await request(app).put('/api/pascom/conteudo').set(como('atend')).send({ nome: 'X' })).status).toBe(403);
    expect(publicarConteudo).not.toHaveBeenCalled();
  });

  it('erro de validação chega em português e nada é auditado', async () => {
    publicarConteudo.mockRejectedValue(new ErroNegocio('E-mail: E-mail inválido.'));
    const r = await request(app).put('/api/pascom/conteudo').set(como('admin')).send({ email: 'x' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('E-mail: E-mail inválido.');
    expect(registrarAuditoria).not.toHaveBeenCalled();
  });

  it('corpo que não é objeto dá 400', async () => {
    expect((await request(app).put('/api/pascom/conteudo').set(como('admin')).send([1, 2])).status).toBe(400);
  });
});
