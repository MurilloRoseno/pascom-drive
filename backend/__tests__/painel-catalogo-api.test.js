jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/config-store', () => ({ lerConfig: jest.fn(), salvarConfig: jest.fn(), CAMPOS: {} }));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true), ultimasAlteracoes: jest.fn() }));
jest.mock('../lib/categorias', () => ({
  listarCategorias: jest.fn(), criarCategoria: jest.fn(), atualizarCategoria: jest.fn(),
  moverCategoria: jest.fn(), removerCategoria: jest.fn(),
}));
jest.mock('../lib/eventos-admin', () => ({
  listarEventosAdmin: jest.fn(), atualizarPublicacao: jest.fn(), atualizarCategoriaEvento: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const router = require('../api/painel');
const { lerConfig } = require('../lib/config-store');
const { registrarAuditoria } = require('../lib/audit');
const cat = require('../lib/categorias');
const ev = require('../lib/eventos-admin');
const { ErroNegocio } = require('../lib/erros');

const app = express();
app.use(express.json());
app.use('/api/pascom', router);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });

beforeEach(() => {
  jest.clearAllMocks();
  lerConfig.mockResolvedValue({ precoFoto: 5, prazoPadraoDias: 7 });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('eventos', () => {
  it('lista eventos com o prazo padrão', async () => {
    ev.listarEventosAdmin.mockResolvedValue([{ eventoId: 'E1' }]);
    const r = await request(app).get('/api/pascom/eventos').set(como('foto'));
    expect(r.body).toEqual({ eventos: [{ eventoId: 'E1' }], prazoPadraoDias: 7 });
  });

  it('atendimento tem eventos.ver mas não edita publicação', async () => {
    expect((await request(app).get('/api/pascom/eventos').set(como('atend'))).status).toBe(200);
    const r = await request(app).put('/api/pascom/eventos/E1/publicacao').set(como('atend')).send({ modo: 'agora', prazoDias: 7 });
    expect(r.status).toBe(403);
  });

  it('publica e audita com o nome do evento', async () => {
    ev.atualizarPublicacao.mockResolvedValue({ nome: 'Missa', estado: 'no_ar', prazoDias: 7, publicarEm: '2026-10-03T12:00' });
    const r = await request(app).put('/api/pascom/eventos/E1/publicacao').set(como('foto')).send({ modo: 'agora', prazoDias: 7 });
    expect(r.status).toBe(200);
    expect(ev.atualizarPublicacao).toHaveBeenCalledWith('E1', { modo: 'agora', prazoDias: 7 });
    expect(registrarAuditoria.mock.calls[0][0].mensagem).toBe('Evento «Missa»: publicado (7 dias no ar)');
  });

  it('arquivar também fica na auditoria', async () => {
    ev.atualizarPublicacao.mockResolvedValue({ nome: 'Missa', estado: 'arquivado', prazoDias: 0, publicarEm: '' });
    await request(app).put('/api/pascom/eventos/E1/publicacao').set(como('coord')).send({ modo: 'arquivar', prazoDias: 0 });
    expect(registrarAuditoria.mock.calls[0][0].mensagem).toBe('Evento «Missa»: arquivado');
  });

  it('erro de negócio devolve a mensagem e o status certos', async () => {
    ev.atualizarPublicacao.mockRejectedValue(new ErroNegocio('Escolha um dia a partir de hoje.'));
    const r = await request(app).put('/api/pascom/eventos/E1/publicacao').set(como('admin')).send({ modo: 'agendar', prazoDias: 7 });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Escolha um dia a partir de hoje.');
    ev.atualizarPublicacao.mockRejectedValue(new ErroNegocio('Evento não encontrado.', 404));
    expect((await request(app).put('/api/pascom/eventos/X/publicacao').set(como('admin')).send({ modo: 'agora', prazoDias: 7 })).status).toBe(404);
  });

  it('erro interno não vaza a mensagem', async () => {
    ev.atualizarPublicacao.mockRejectedValue(new Error('Google API key abc123 inválida'));
    const r = await request(app).put('/api/pascom/eventos/E1/publicacao').set(como('admin')).send({ modo: 'agora', prazoDias: 7 });
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('abc123');
  });

  it('muda a categoria do evento', async () => {
    ev.atualizarCategoriaEvento.mockResolvedValue({ nome: 'Missa', categoria: 'crisma' });
    const r = await request(app).put('/api/pascom/eventos/E1/categoria').set(como('coord')).send({ categoria: 'crisma' });
    expect(r.status).toBe(200);
    expect((await request(app).put('/api/pascom/eventos/E1/categoria').set(como('coord')).send({ categoria: 'x', status: 'y' })).status).toBe(400);
  });
});

describe('categorias', () => {
  it('lista com as ocultas; cria, edita, move e remove com a permissão certa', async () => {
    cat.listarCategorias.mockResolvedValue([{ id: 'a' }]);
    expect((await request(app).get('/api/pascom/categorias').set(como('coord'))).body).toEqual({ categorias: [{ id: 'a' }] });
    expect(cat.listarCategorias).toHaveBeenCalledWith({ incluirOcultas: true });

    cat.criarCategoria.mockResolvedValue({ id: 'nova', nome: 'Nova' });
    expect((await request(app).post('/api/pascom/categorias').set(como('coord')).send({ nome: 'Nova', tipo: 'sacramento' })).status).toBe(201);

    cat.atualizarCategoria.mockResolvedValue({ id: 'nova', nome: 'Nova' });
    expect((await request(app).patch('/api/pascom/categorias/nova').set(como('coord')).send({ ativo: false })).status).toBe(200);

    cat.moverCategoria.mockResolvedValue(true);
    expect((await request(app).post('/api/pascom/categorias/nova/mover').set(como('coord')).send({ direcao: 'subir' })).body).toEqual({ moveu: true });

    cat.removerCategoria.mockResolvedValue({ resultado: 'removida' });
    expect((await request(app).delete('/api/pascom/categorias/nova').set(como('coord'))).body).toEqual({ resultado: 'removida' });
  });

  it('fotógrafo não vê nem mexe em categorias', async () => {
    expect((await request(app).get('/api/pascom/categorias').set(como('foto'))).status).toBe(403);
    expect((await request(app).post('/api/pascom/categorias').set(como('foto')).send({ nome: 'X', tipo: 'sacramento' })).status).toBe(403);
  });

  it('recusa corpo com campo desconhecido e direção inválida', async () => {
    expect((await request(app).post('/api/pascom/categorias').set(como('admin')).send({ nome: 'X', tipo: 'sacramento', id: 'celebracoes' })).status).toBe(400);
    expect((await request(app).post('/api/pascom/categorias/a/mover').set(como('admin')).send({ direcao: 'cima' })).status).toBe(400);
  });
});
