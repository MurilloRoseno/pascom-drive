const {
  getSheet, registrarFoto, inicializarEstrutura, invalidarCacheSite, listarCategoriasEvento,
} = require('../Sheet');

beforeEach(() => jest.clearAllMocks());

it('abre a aba Fotos configurada', () => {
  getSheet();
  expect(SpreadsheetApp.openById).toHaveBeenCalledWith('spreadsheet-id-test');
  expect(__mockSpreadsheet__.getSheetByName).toHaveBeenCalledWith('Fotos');
});

it('registra preview e identificador privado sem link publico do original', () => {
  registrarFoto({
    id: 'FOTO_001',
    eventoId: 'EV1',
    evento: 'Casamento',
    originalFileId: 'PRIVATE_ORIGINAL',
    previewFileId: 'PREVIEW_FILE',
    linkAmostra: 'https://drive.google.com/preview',
    preco: 10,
  });
  const row = __mockSheet__.appendRow.mock.calls[0][0];
  expect(row).toContain('PRIVATE_ORIGINAL');
  expect(row).toContain('PREVIEW_FILE');
  expect(row).not.toContain('https://link-original-publico.test');
  expect(row).toContain('NAO');
});

it('inicializa a estrutura em script independente sem exigir interface da planilha', () => {
  expect(() => inicializarEstrutura()).not.toThrow();
  expect(__mockSpreadsheet__.getSheetByName).toHaveBeenCalledWith('EquipePascom');
  expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Estrutura preparada'));
});

it('remove validacoes antigas antes de reaplicar as listas administrativas', () => {
  const clearDataValidations = jest.fn();
  __mockRange__.clearDataValidations = clearDataValidations;
  __mockSheet__.getMaxRows = jest.fn().mockReturnValue(10);
  try {
    inicializarEstrutura();
    expect(clearDataValidations).toHaveBeenCalled();
  } finally {
    delete __mockRange__.clearDataValidations;
    delete __mockSheet__.getMaxRows;
  }
});

it('assina invalidacao de cache com HMAC do Apps Script', () => {
  global.UrlFetchApp = {
    fetch: jest.fn().mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(204),
      getContentText: jest.fn().mockReturnValue(''),
    }),
  };
  const original = PropertiesService.getScriptProperties().getProperty;
  PropertiesService.getScriptProperties().getProperty.mockImplementation((key) => ({
    SPREADSHEET_ID: 'spreadsheet-id-test',
    BACKEND_URL: 'https://pascom-drive.vercel.app',
    CACHE_INVALIDATION_SECRET: 'cache-legacy',
    APPS_SCRIPT_HMAC_SECRET: 'apps-secret',
  }[key] || null));

  try {
    expect(invalidarCacheSite('EV1')).toBe(true);
    const options = UrlFetchApp.fetch.mock.calls[0][1];
    expect(options.headers['x-pascom-timestamp']).toBeDefined();
    expect(options.headers['x-pascom-signature']).toMatch(/^[a-f0-9]{64}$/);
    expect(options.headers['x-cache-invalidation-secret']).toBeUndefined();
  } finally {
    PropertiesService.getScriptProperties().getProperty = original;
    delete global.UrlFetchApp;
  }
});

describe('listarCategoriasEvento (lista suspensa de Eventos.Categoria)', () => {
  const PADRAO = ['celebracoes', 'batismo', 'eucaristia', 'crisma', 'casamento', 'uncao-dos-enfermos', 'ordem'];
  const abaCom = (valores) => ({ getDataRange: () => ({ getValues: () => valores }) });
  const CAB = ['Id', 'Nome', 'Tipo', 'Ordem', 'Ativo'];

  afterEach(() => __mockSpreadsheet__.getSheetByName.mockReset());

  it('usa as categorias ativas da aba Categorias, na ordem do painel', () => {
    __mockSpreadsheet__.getSheetByName.mockReturnValue(abaCom([
      CAB,
      ['ordem', 'Ordem', 'sacramento', '3', 'SIM'],
      ['profissao-de-fe', 'Profissão de Fé', 'sacramento', '8', 'SIM'],
      ['batismo', 'Batismo', 'sacramento', '2', 'SIM'],
      ['escondida', 'Escondida', 'celebracao', '4', 'NAO'],
      ['antiga', 'Antiga', 'celebracao', '5', 'REMOVIDA'],
    ]));
    expect(listarCategoriasEvento()).toEqual(['batismo', 'ordem', 'profissao-de-fe']);
    expect(__mockSpreadsheet__.getSheetByName).toHaveBeenCalledWith('Categorias');
  });

  it('sem a aba, com a aba vazia, sem as colunas esperadas ou sem nenhuma ativa: lista fixa', () => {
    __mockSpreadsheet__.getSheetByName.mockReturnValue(null);
    expect(listarCategoriasEvento()).toEqual(PADRAO);
    __mockSpreadsheet__.getSheetByName.mockReturnValue(abaCom([CAB]));
    expect(listarCategoriasEvento()).toEqual(PADRAO);
    __mockSpreadsheet__.getSheetByName.mockReturnValue(abaCom([['Outra', 'Coisa'], ['a', 'b']]));
    expect(listarCategoriasEvento()).toEqual(PADRAO);
    __mockSpreadsheet__.getSheetByName.mockReturnValue(abaCom([CAB, ['x', 'X', 'sacramento', '1', 'NAO']]));
    expect(listarCategoriasEvento()).toEqual(PADRAO);
  });

  it('erro ao ler a planilha não derruba a preparação da estrutura: lista fixa', () => {
    __mockSpreadsheet__.getSheetByName.mockImplementation(() => { throw new Error('sem acesso'); });
    expect(listarCategoriasEvento()).toEqual(PADRAO);
  });

  it('a lista fixa devolvida é uma cópia: mexer nela não altera a configuração', () => {
    __mockSpreadsheet__.getSheetByName.mockReturnValue(null);
    listarCategoriasEvento().push('lixo');
    expect(listarCategoriasEvento()).toEqual(PADRAO);
  });
});
