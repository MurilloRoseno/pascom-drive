// A janela de publicação (PublicarEm/ExpiraEm) vale no catálogo e na compra sem esperar
// o cache de 5 minutos: o estado é recalculado a cada leitura.

const mockCache = new Map();
jest.mock('../lib/runtime-cache', () => ({
  readThrough: async (key, loader) => {
    if (!mockCache.has(key)) mockCache.set(key, JSON.parse(JSON.stringify(await loader())));
    return { value: mockCache.get(key), source: 'cache' };
  },
}));

const mockRows = { Eventos: [], Fotos: [] };
jest.mock('../lib/google-sheets.shared', () => ({
  ...jest.requireActual('../lib/google-sheets.shared'),
  rows: async (titulo) => mockRows[titulo] || [],
}));

const catalogo = require('../lib/google-sheets.catalog');
const { eventoFromRow } = require('../lib/google-sheets.shared');

const linha = (dados) => ({ get: (k) => dados[k] });
const evento = (id, extra = {}) => linha({
  EventoID: id, Titulo: id, Categoria: 'celebracoes', DataEvento: '2026-05-26', Publicacao: 'publicado', Visibilidade: 'publica', VendaAutorizada: 'SIM', ...extra,
});

// 2026-10-03 12:00 em São Paulo = 15:00 UTC
const em = (utc) => jest.useFakeTimers({ now: new Date(utc) });

beforeEach(() => {
  mockCache.clear();
  mockRows.Eventos = [];
  mockRows.Fotos = [];
});
afterEach(() => jest.useRealTimers());

describe('eventoFromRow: publication é o estado efetivo', () => {
  it('evento antigo publicado, sem as colunas novas, continua publicado', () => {
    em('2026-10-03T15:00:00Z');
    const e = eventoFromRow(evento('A'));
    expect(e).toMatchObject({ publication: 'publicado', publicationRaw: 'publicado', publishAt: '', expiresAt: '', retentionDays: 0 });
  });

  it('publicado com data futura vira "agendado" (e por isso não passa em nenhum teste === publicado)', () => {
    em('2026-10-03T15:00:00Z');
    const e = eventoFromRow(evento('A', { PublicarEm: '2026-10-17T08:00', ExpiraEm: '2026-10-24T08:00', PrazoDias: '7' }));
    expect(e.publication).toBe('agendado');
    expect(e.publicationRaw).toBe('publicado');
    expect(e.retentionDays).toBe(7);
  });

  it('prazo vencido vira "arquivado"; rascunho segue rascunho; coluna vazia vira rascunho', () => {
    em('2026-10-03T15:00:00Z');
    expect(eventoFromRow(evento('A', { PublicarEm: '2026-09-20T08:00', ExpiraEm: '2026-09-27T08:00' })).publication).toBe('arquivado');
    expect(eventoFromRow(evento('B', { Publicacao: 'rascunho' })).publication).toBe('rascunho');
    expect(eventoFromRow(evento('C', { Publicacao: '' })).publication).toBe('rascunho');
  });
});

describe('catálogo público respeita a janela depois do cache', () => {
  it('evento agendado fica fora e entra no ar quando chega a hora, com o cache já preenchido', async () => {
    mockRows.Eventos = [evento('LEGADO'), evento('AGENDADO', { PublicarEm: '2026-10-17T08:00', ExpiraEm: '2026-10-24T08:00' })];

    em('2026-10-03T15:00:00Z');
    expect((await catalogo.listarEventosPublicados()).map((e) => e.eventoId)).toEqual(['LEGADO']);

    em('2026-10-17T11:00:00Z'); // 08:00 em São Paulo
    expect(mockCache.size).toBe(1);
    expect((await catalogo.listarEventosPublicados()).map((e) => e.eventoId)).toEqual(['LEGADO', 'AGENDADO']);
  });

  it('evento com prazo sai do ar na hora, sem esperar o cache expirar', async () => {
    mockRows.Eventos = [evento('COM_PRAZO', { PublicarEm: '2026-10-03T09:00', ExpiraEm: '2026-10-10T09:00' })];

    em('2026-10-10T11:59:00Z');
    expect(await catalogo.listarEventosPublicados()).toHaveLength(1);

    em('2026-10-10T12:00:00Z');
    expect(await catalogo.listarEventosPublicados()).toHaveLength(0);
  });

  it('o site não recebe as datas internas e o estado devolvido é "publicado"', async () => {
    mockRows.Eventos = [evento('A', { PublicarEm: '2026-10-01T09:00', ExpiraEm: '2026-10-30T09:00', PrazoDias: '29' })];
    em('2026-10-03T15:00:00Z');
    const [publico] = await catalogo.listarEventosPublicados();
    expect(publico.publication).toBe('publicado');
    for (const campo of ['publicationRaw', 'publishAt', 'expiresAt', 'retentionDays', 'codeHash']) {
      expect(publico).not.toHaveProperty(campo);
    }
  });

  it('rascunho e arquivado nunca aparecem, mesmo com datas boas', async () => {
    mockRows.Eventos = [
      evento('R', { Publicacao: 'rascunho', PublicarEm: '2026-10-01T09:00' }),
      evento('X', { Publicacao: 'arquivado' }),
    ];
    em('2026-10-03T15:00:00Z');
    expect(await catalogo.listarEventosPublicados()).toEqual([]);
  });
});

describe('compra: o evento chega com o estado efetivo', () => {
  it('buscarFotosParaCompra devolve publication "agendado"/"arquivado", que o checkout recusa', async () => {
    mockRows.Eventos = [
      evento('AGENDADO', { PublicarEm: '2026-10-17T08:00' }),
      evento('VENCIDO', { PublicarEm: '2026-09-01T08:00', ExpiraEm: '2026-09-08T08:00' }),
      evento('NO_AR'),
    ];
    mockRows.Fotos = ['AGENDADO', 'VENCIDO', 'NO_AR'].map((id) => linha({ FotoID: `F_${id}`, EventoID: id, StatusProcessamento: 'Processada', DisponivelVenda: 'SIM' }));
    em('2026-10-03T15:00:00Z');
    const itens = await catalogo.buscarFotosParaCompra(['F_AGENDADO', 'F_VENCIDO', 'F_NO_AR']);
    const estados = Object.fromEntries(itens.map(({ foto, evento: e }) => [foto.id, e.publication]));
    expect(estados).toEqual({ F_AGENDADO: 'agendado', F_VENCIDO: 'arquivado', F_NO_AR: 'publicado' });
  });
});
