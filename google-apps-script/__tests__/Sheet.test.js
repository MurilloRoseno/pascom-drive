const { getSheet, registrarFoto, inicializarEstrutura, invalidarCacheSite } = require('../Sheet');

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
