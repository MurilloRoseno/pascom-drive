jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/faq', () => ({
  TEMAS: [{ id: 'comprar', nome: 'Comprar fotos' }],
  listarFaq: jest.fn(), criarFaq: jest.fn(), atualizarFaq: jest.fn(), excluirFaq: jest.fn(),
}));
jest.mock('../lib/sem-resposta', () => ({ listarSemResposta: jest.fn(), resolverSemResposta: jest.fn() }));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true) }));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const router = require('../api/painel/ajuda');
const faq = require('../lib/faq');
const semResposta = require('../lib/sem-resposta');
const { registrarAuditoria } = require('../lib/audit');
const { ErroNegocio } = require('../lib/erros');

const app = express();
app.use(express.json());
app.use('/api/pascom/faq', router);
app.use(errorHandler);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/pascom/faq', () => {
  it('lista tudo (com rascunhos) e as perguntas sem resposta', async () => {
    faq.listarFaq.mockResolvedValue([{ id: 'f1' }]);
    semResposta.listarSemResposta.mockResolvedValue(['Aceitam débito?']);
    const r = await request(app).get('/api/pascom/faq').set(como('atend'));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ temas: [{ id: 'comprar', nome: 'Comprar fotos' }], perguntas: [{ id: 'f1' }], semResposta: ['Aceitam débito?'] });
    expect(faq.listarFaq).toHaveBeenCalledWith();
  });

  it('fotógrafo não tem acesso (ajuda.ver); sem login, 401', async () => {
    expect((await request(app).get('/api/pascom/faq').set(como('foto'))).status).toBe(403);
    expect((await request(app).get('/api/pascom/faq')).status).toBe(401);
  });
});

describe('POST /api/pascom/faq', () => {
  it('cria, resolve a pergunta de origem e registra na auditoria', async () => {
    faq.criarFaq.mockResolvedValue({ id: 'faq_1', pergunta: 'Aceitam débito?' });
    const r = await request(app).post('/api/pascom/faq').set(como('atend')).send({ tema: 'pagar', pergunta: 'Aceitam débito?', daPergunta: 'Aceitam débito?' });
    expect(r.status).toBe(201);
    expect(faq.criarFaq).toHaveBeenCalledWith({ tema: 'pagar', pergunta: 'Aceitam débito?' });
    expect(semResposta.resolverSemResposta).toHaveBeenCalledWith('Aceitam débito?');
    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ mensagem: expect.stringContaining('criada (rascunho)') }));
  });

  it('sem daPergunta não mexe nas perguntas sem resposta', async () => {
    faq.criarFaq.mockResolvedValue({ id: 'faq_2', pergunta: 'X?' });
    await request(app).post('/api/pascom/faq').set(como('coord')).send({ tema: 'pagar', pergunta: 'X ou Y?' });
    expect(semResposta.resolverSemResposta).not.toHaveBeenCalled();
  });

  it('dados inválidos viram 400 e nada é criado', async () => {
    faq.criarFaq.mockRejectedValue(new (require('zod').ZodError)([]));
    const r = await request(app).post('/api/pascom/faq').set(como('atend')).send({ tema: 'x' });
    expect(r.status).toBe(400);
    expect(semResposta.resolverSemResposta).not.toHaveBeenCalled();
  });
});

describe('PATCH e DELETE', () => {
  it('publica e a auditoria diz "publicada"', async () => {
    faq.atualizarFaq.mockResolvedValue({ id: 'f1', pergunta: 'Como compro?' });
    const r = await request(app).patch('/api/pascom/faq/f1').set(como('atend')).send({ publicada: true });
    expect(r.status).toBe(200);
    expect(faq.atualizarFaq).toHaveBeenCalledWith('f1', { publicada: true });
    expect(registrarAuditoria.mock.calls[0][0].mensagem).toBe('Central de ajuda: pergunta «Como compro?» publicada');
  });

  it('erro de negócio mantém status e mensagem (ex.: sem resposta)', async () => {
    faq.atualizarFaq.mockRejectedValue(new ErroNegocio('Escreva a resposta antes de publicar.'));
    const r = await request(app).patch('/api/pascom/faq/f1').set(como('coord')).send({ publicada: true });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Escreva a resposta antes de publicar.');
  });

  it('excluir exige ajuda.excluir: atendimento NÃO exclui, coordenação sim', async () => {
    expect((await request(app).delete('/api/pascom/faq/f1').set(como('atend'))).status).toBe(403);
    expect(faq.excluirFaq).not.toHaveBeenCalled();
    faq.excluirFaq.mockResolvedValue();
    expect((await request(app).delete('/api/pascom/faq/f1').set(como('coord'))).status).toBe(200);
    expect(faq.excluirFaq).toHaveBeenCalledWith('f1');
  });
});
