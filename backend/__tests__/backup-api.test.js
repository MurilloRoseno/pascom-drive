jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
jest.mock('../lib/acessos', () => ({ garantirMatriz: jest.fn().mockResolvedValue(), listarMatriz: jest.fn(), salvarAcesso: jest.fn() }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn(), adicionarMembro: jest.fn(), atualizarMembro: jest.fn() }));
jest.mock('../lib/backup', () => ({ montarBackup: jest.fn() }));
jest.mock('../lib/audit', () => ({ registrarAuditoria: jest.fn().mockResolvedValue(true), ultimasAlteracoes: jest.fn() }));

const request = require('supertest');
const express = require('express');
const router = require('../api/painel');
const { montarBackup } = require('../lib/backup');
const { registrarAuditoria } = require('../lib/audit');

const app = express();
app.use(express.json());
app.use('/api/pascom', router);

const como = (papel) => ({ Authorization: `Bearer ${papel}` });

beforeEach(() => {
  jest.clearAllMocks();
  montarBackup.mockResolvedValue({ geradoEm: '2026-10-03T12:00:00.000Z', configuracoes: { precoFoto: 5 }, equipe: [{ email: 'a@b.c' }] });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/pascom/backup', () => {
  it('o administrador baixa um JSON com nome de arquivo datado, sem cache, e a ação fica na auditoria', async () => {
    const r = await request(app).get('/api/pascom/backup').set(como('admin'));
    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toBe('attachment; filename="pascom-backup-2026-10-03.json"');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.body.configuracoes).toEqual({ precoFoto: 5 });
    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ mensagem: 'Backup das configurações baixado' }));
  });

  it('coordenação, fotógrafo e atendimento não baixam (leva a lista da equipe); sem login, 401', async () => {
    for (const papel of ['coord', 'foto', 'atend']) {
      expect((await request(app).get('/api/pascom/backup').set(como(papel))).status).toBe(403);
    }
    expect((await request(app).get('/api/pascom/backup')).status).toBe(401);
    expect(montarBackup).not.toHaveBeenCalled();
  });

  it('falha ao montar vira erro genérico, sem detalhe', async () => {
    montarBackup.mockRejectedValue(new Error('planilha caiu'));
    const r = await request(app).get('/api/pascom/backup').set(como('admin'));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/planilha/);
    expect(registrarAuditoria).not.toHaveBeenCalled();
  });
});
