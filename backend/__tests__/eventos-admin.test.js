jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn(), rows: jest.fn() }));
jest.mock('../lib/categorias', () => ({ slugsAtivos: jest.fn(), CATEGORIA_PADRAO: 'celebracoes' }));
jest.mock('../lib/runtime-cache', () => ({ invalidateCacheTags: jest.fn().mockResolvedValue() }));

const { obterAba, rows } = require('../lib/google-sheets');
const { slugsAtivos } = require('../lib/categorias');
const { invalidateCacheTags } = require('../lib/runtime-cache');
const { criarAba } = require('../test-utils/fake-sheet');
const { listarEventosAdmin, atualizarPublicacao, atualizarCategoriaEvento } = require('../lib/eventos-admin');

const AGORA = new Date('2026-10-03T15:00:00Z'); // 12:00 em São Paulo
let aba;

// Esquema real da aba Eventos: Titulo, Categoria, DataEvento, StatusProcessamento, Publicacao...
const evento = (extra) => ({
  EventoID: 'X', NomePasta: 'pasta', Titulo: 'Titulo', Categoria: 'batismo', DataEvento: '2026-09-26', StatusProcessamento: 'Processado',
  Visibilidade: 'publica', VendaAutorizada: 'SIM', Publicacao: 'rascunho', TotalFotos: '10', ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  aba = criarAba([
    evento({ EventoID: 'MISSA', Titulo: 'Missa dominical', Categoria: 'celebracoes', Publicacao: 'publicado', TotalFotos: '40' }),
    evento({ EventoID: 'BATISMO', Titulo: 'Batismo', Publicacao: 'publicado', PublicarEm: '2026-10-17T08:00', ExpiraEm: '2026-10-24T08:00', PrazoDias: '7', TotalFotos: '12' }),
    evento({ EventoID: 'FESTA', Titulo: 'Festa', Categoria: 'celebracoes', Publicacao: 'publicado', PublicarEm: '2026-09-20T10:00', ExpiraEm: '2026-09-27T10:00', PrazoDias: '7' }),
    evento({ EventoID: 'RASCUNHO', Titulo: 'Rascunho', Publicacao: 'rascunho' }),
    evento({ EventoID: 'SEM_CATEGORIA', Titulo: 'Sem categoria', Categoria: '' }),
    evento({ EventoID: 'COM_ERRO', Titulo: 'Com erro', StatusProcessamento: 'Erro' }),
  ]);
  obterAba.mockResolvedValue(aba);
  rows.mockImplementation(async () => aba.linhas.map((l) => l));
  slugsAtivos.mockResolvedValue(['celebracoes', 'batismo', 'crisma']);
});

const valores = (id) => aba.valores().find((v) => v.EventoID === id);

describe('listarEventosAdmin', () => {
  it('lê só (não pede nem altera cabeçalhos) e traz o estado calculado', async () => {
    const lista = await listarEventosAdmin(AGORA);
    expect(obterAba).not.toHaveBeenCalled();
    const por = Object.fromEntries(lista.map((e) => [e.eventoId, e]));
    expect(por.MISSA).toMatchObject({ nome: 'Missa dominical', categoria: 'celebracoes', totalFotos: 40, estado: 'no_ar', saiEmDias: null, prazoDias: 0, publicacao: 'publicado' });
    expect(por.BATISMO).toMatchObject({ estado: 'agendado', prazoDias: 7, publicarEm: '2026-10-17T08:00' });
    expect(por.FESTA.estado).toBe('arquivado');
    expect(por.RASCUNHO.estado).toBe('rascunho');
  });

  it('categoria vazia mostra a padrão, mas avisa que não foi preenchida; traz data e processamento', async () => {
    const e = (await listarEventosAdmin(AGORA)).find((x) => x.eventoId === 'SEM_CATEGORIA');
    expect(e).toMatchObject({ categoria: 'celebracoes', categoriaPreenchida: false, data: '2026-09-26', statusProcessamento: 'Processado' });
  });
});

describe('atualizarPublicacao', () => {
  it('publica agora com prazo: grava intenção, janela, DataPublicacao e renova o cache', async () => {
    const r = await atualizarPublicacao('RASCUNHO', { modo: 'agora', prazoDias: 3 }, AGORA);
    expect(r).toMatchObject({ estado: 'no_ar', publicarEm: '2026-10-03T12:00', expiraEm: '2026-10-06T12:00', saiEmDias: 3 });
    expect(valores('RASCUNHO')).toMatchObject({
      Publicacao: 'publicado', PublicarEm: '2026-10-03T12:00', ExpiraEm: '2026-10-06T12:00', PrazoDias: '3', Titulo: 'Rascunho', Categoria: 'batismo',
    });
    expect(valores('RASCUNHO').DataPublicacao).toBe('2026-10-03T15:00:00.000Z');
    expect(obterAba).toHaveBeenCalledWith('Eventos', ['PublicarEm', 'ExpiraEm', 'PrazoDias']);
    expect(invalidateCacheTags).toHaveBeenCalledWith(['catalogo-eventos', 'evento-RASCUNHO', 'media-RASCUNHO']);
  });

  it('agendar para o futuro: segue "publicado" na planilha e o estado calculado é agendado', async () => {
    const r = await atualizarPublicacao('RASCUNHO', { modo: 'agendar', data: '2026-10-20', hora: '09:30', prazoDias: 0 }, AGORA);
    expect(r.estado).toBe('agendado');
    expect(valores('RASCUNHO')).toMatchObject({ Publicacao: 'publicado', PublicarEm: '2026-10-20T09:30', ExpiraEm: '', PrazoDias: '0' });
  });

  it('não publica sem categoria ou sem data do evento', async () => {
    await expect(atualizarPublicacao('SEM_CATEGORIA', { modo: 'agora', prazoDias: 7 }, AGORA)).rejects.toThrow('Informe a categoria e a data do evento antes de publicar.');
    expect(valores('SEM_CATEGORIA').Publicacao).toBe('rascunho');
    aba = criarAba([evento({ EventoID: 'SEM_DATA', DataEvento: '' })]);
    obterAba.mockResolvedValue(aba);
    await expect(atualizarPublicacao('SEM_DATA', { modo: 'agora', prazoDias: 7 }, AGORA)).rejects.toThrow('antes de publicar');
  });

  it('não publica evento cujo processamento terminou com erro', async () => {
    await expect(atualizarPublicacao('COM_ERRO', { modo: 'agora', prazoDias: 7 }, AGORA)).rejects.toThrow('processamento deste evento terminou com erro');
    expect(valores('COM_ERRO').Publicacao).toBe('rascunho');
  });

  it('mas deixa voltar a rascunho ou arquivar um evento com erro', async () => {
    expect((await atualizarPublicacao('COM_ERRO', { modo: 'arquivar', prazoDias: 0 }, AGORA)).estado).toBe('arquivado');
  });

  it('arquivar não mexe na autorização de venda (publicar de novo retoma a venda)', async () => {
    const r = await atualizarPublicacao('MISSA', { modo: 'arquivar', prazoDias: 7 }, AGORA);
    expect(r.estado).toBe('arquivado');
    expect(valores('MISSA')).toMatchObject({ Publicacao: 'arquivado', PublicarEm: '', ExpiraEm: '', VendaAutorizada: 'SIM' });
  });

  it('voltar a rascunho tira o evento da área pública', async () => {
    const r = await atualizarPublicacao('FESTA', { modo: 'rascunho', prazoDias: 7 }, AGORA);
    expect(r.estado).toBe('rascunho');
    expect(valores('FESTA')).toMatchObject({ Publicacao: 'rascunho', PublicarEm: '', ExpiraEm: '' });
  });

  it('recusa data no passado e campos extras sem gravar nada nem renovar cache', async () => {
    await expect(atualizarPublicacao('RASCUNHO', { modo: 'agendar', data: '2026-10-01', hora: '09:00', prazoDias: 7 }, AGORA)).rejects.toThrow('Escolha um dia a partir de hoje');
    await expect(atualizarPublicacao('RASCUNHO', { modo: 'agora', prazoDias: 7, expiraEm: 'x' }, AGORA)).rejects.toThrow();
    expect(valores('RASCUNHO').Publicacao).toBe('rascunho');
    expect(invalidateCacheTags).not.toHaveBeenCalled();
  });

  it('evento inexistente dá erro claro', async () => {
    await expect(atualizarPublicacao('NADA', { modo: 'agora', prazoDias: 7 }, AGORA)).rejects.toThrow('Evento não encontrado.');
  });

  it('falha ao renovar o cache não desfaz a publicação', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    invalidateCacheTags.mockRejectedValueOnce(new Error('sem cache'));
    const r = await atualizarPublicacao('RASCUNHO', { modo: 'agora', prazoDias: 7 }, AGORA);
    expect(r.estado).toBe('no_ar');
  });
});

describe('atualizarCategoriaEvento', () => {
  it('aceita só categoria ativa e renova o cache', async () => {
    await atualizarCategoriaEvento('RASCUNHO', 'crisma');
    expect(valores('RASCUNHO').Categoria).toBe('crisma');
    expect(invalidateCacheTags).toHaveBeenCalledTimes(1);
    await expect(atualizarCategoriaEvento('RASCUNHO', 'inventada')).rejects.toThrow('Categoria inválida.');
    expect(valores('RASCUNHO').Categoria).toBe('crisma');
  });
});
