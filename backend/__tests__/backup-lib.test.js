jest.mock('../lib/config-store', () => ({ lerConfig: jest.fn().mockResolvedValue({ precoFoto: 5 }) }));
jest.mock('../lib/categorias', () => ({ listarCategorias: jest.fn().mockResolvedValue([{ id: 'a' }]) }));
jest.mock('../lib/faq', () => ({ listarFaq: jest.fn().mockResolvedValue([{ id: 'f' }]) }));
jest.mock('../lib/agenda', () => ({ listarCompromissos: jest.fn().mockResolvedValue([{ id: 'c' }]) }));
jest.mock('../lib/modulos', () => ({ lerModulos: jest.fn().mockResolvedValue({ busca: {} }) }));
jest.mock('../lib/acessos', () => ({ listarMatriz: jest.fn().mockResolvedValue({ admin: [] }) }));
jest.mock('../lib/equipe', () => ({ listarEquipe: jest.fn().mockResolvedValue([{ email: 'a@b.c' }]) }));

const { montarBackup } = require('../lib/backup');
const { listarCategorias } = require('../lib/categorias');
const { listarCompromissos } = require('../lib/agenda');

describe('montarBackup', () => {
  it('reúne as 7 áreas configuráveis e a data de geração', async () => {
    const b = await montarBackup(new Date('2026-10-03T12:00:00Z'));
    expect(Object.keys(b)).toEqual(['geradoEm', 'configuracoes', 'categorias', 'faq', 'agenda', 'modulos', 'acessos', 'equipe']);
    expect(b.geradoEm).toBe('2026-10-03T12:00:00.000Z');
  });

  it('inclui categorias ocultas e compromissos inativos', async () => {
    await montarBackup();
    expect(listarCategorias).toHaveBeenCalledWith({ incluirOcultas: true });
    expect(listarCompromissos).toHaveBeenCalledWith({ incluirInativos: true });
  });

  it('não leva pedidos nem segredos', async () => {
    const b = await montarBackup();
    expect(JSON.stringify(b)).not.toMatch(/pedido|secret|token/i);
  });
});
