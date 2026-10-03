jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/config-store', () => ({
  lerConfig: jest.fn(),
  salvarConfig: jest.fn(),
  CAMPOS: {
    precoFoto: {}, prazoPadraoDias: {}, tarja: {}, previaLargura: {}, whatsapp: {},
    repassarTaxa: {}, distribuicaoTaxa: {}, tarifaCartaoPct: {},
  },
}));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true), ultimasAlteracoes: jest.fn() }));

const request = require('supertest');
const express = require('express');
const router = require('../api/painel');
const { lerConfig, salvarConfig } = require('../lib/config-store');
const { registrarAuditoria, ultimasAlteracoes } = require('../lib/audit');
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

describe('autenticação', () => {
  it('401 sem token e 403 para quem não é da equipe', async () => {
    expect((await request(app).get('/api/pascom/configuracoes')).status).toBe(401);
    expect((await request(app).get('/api/pascom/configuracoes').set(como('forasteiro'))).status).toBe(403);
  });
});

describe('configurações', () => {
  it('qualquer membro lê', async () => {
    const r = await request(app).get('/api/pascom/configuracoes').set(como('foto'));
    expect(r.status).toBe(200);
    expect(r.body.precoFoto).toBe(5);
  });

  it('coordenação NÃO altera o preço (pagamentos.editar é do admin)', async () => {
    const r = await request(app).put('/api/pascom/configuracoes').set(como('coord')).send({ chave: 'precoFoto', valor: 1 });
    expect(r.status).toBe(403);
    expect(salvarConfig).not.toHaveBeenCalled();
  });

  it('admin altera o preço e a mudança vai para a auditoria com antes e depois', async () => {
    salvarConfig.mockResolvedValue(6);
    const r = await request(app).put('/api/pascom/configuracoes').set(como('admin')).send({ chave: 'precoFoto', valor: '6' });
    expect(r.status).toBe(200);
    expect(salvarConfig).toHaveBeenCalledWith('precoFoto', '6', 'admin@pascom.org');
    expect(registrarAuditoria).toHaveBeenCalledWith({ quem: 'admin@pascom.org', mensagem: 'Preço por foto: 5 → 6' });
  });

  describe('reautenticação para mexer em dinheiro', () => {
    const PUT = (token, corpo) => request(app).put('/api/pascom/configuracoes').set(como(token)).send(corpo);

    it('login antigo: preço NÃO muda e a API devolve a dica de reverificação do Clerk', async () => {
      const r = await PUT('admin-velho', { chave: 'precoFoto', valor: 6 });
      expect(r.status).toBe(403);
      expect(r.body).toEqual({ clerk_error: { type: 'forbidden', reason: 'reverification-error', metadata: { reverification: 'strict' } } });
      expect(salvarConfig).not.toHaveBeenCalled();
    });

    it('login recente: preço muda normalmente', async () => {
      salvarConfig.mockResolvedValue(6);
      expect((await PUT('admin-novo', { chave: 'precoFoto', valor: 6 })).status).toBe(200);
      expect(salvarConfig).toHaveBeenCalled();
    });

    it.each(['repassarTaxa', 'distribuicaoTaxa', 'tarifaCartaoPct'])('%s também exige reautenticação', async (chave) => {
      expect((await PUT('admin-velho', { chave, valor: 1 })).status).toBe(403);
      expect(salvarConfig).not.toHaveBeenCalled();
    });

    it('prazo padrão e tarja não são dinheiro: não pedem reautenticação', async () => {
      salvarConfig.mockResolvedValue(3);
      expect((await PUT('admin-velho', { chave: 'prazoPadraoDias', valor: 3 })).status).toBe(200);
      expect((await PUT('admin-velho', { chave: 'tarja', valor: false })).status).toBe(200);
    });

    it('sem a permissão, 403 comum de permissão vem antes da dica (coordenação nunca vê o desafio)', async () => {
      const r = await PUT('coord-velho', { chave: 'precoFoto', valor: 6 });
      expect(r.status).toBe(403);
      expect(r.body.error).toBe('Sem permissão para esta ação');
    });
  });

  it('coordenação altera o prazo padrão (eventos.editar)', async () => {
    salvarConfig.mockResolvedValue(3);
    const r = await request(app).put('/api/pascom/configuracoes').set(como('coord')).send({ chave: 'prazoPadraoDias', valor: 3 });
    expect(r.status).toBe(200);
  });

  it('chave desconhecida e corpo com campo extra dão 400', async () => {
    expect((await request(app).put('/api/pascom/configuracoes').set(como('admin')).send({ chave: 'gateway', valor: 'x' })).status).toBe(400);
    expect((await request(app).put('/api/pascom/configuracoes').set(como('admin')).send({ chave: 'precoFoto', valor: 1, extra: 1 })).status).toBe(400);
  });
});


describe('auditoria', () => {
  it('qualquer membro vê as últimas alterações; sem login, 401', async () => {
    ultimasAlteracoes.mockResolvedValue([{ quando: '03/10/2026 10:00:00', quem: 'a@p.org', mensagem: 'x' }]);
    const r = await request(app).get('/api/pascom/auditoria').set(como('atend'));
    expect(r.status).toBe(200);
    expect(r.body.alteracoes).toHaveLength(1);
    expect(ultimasAlteracoes).toHaveBeenCalledWith(8);
    expect((await request(app).get('/api/pascom/auditoria')).status).toBe(401);
  });

  it('falha na planilha vira 500 genérico, sem vazar o motivo', async () => {
    ultimasAlteracoes.mockRejectedValue(new Error('chave secreta xyz'));
    const r = await request(app).get('/api/pascom/auditoria').set(como('admin'));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/xyz/);
  });
});
