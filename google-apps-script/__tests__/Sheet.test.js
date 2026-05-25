const { getSheet, registrarFoto } = require('../Sheet');

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
