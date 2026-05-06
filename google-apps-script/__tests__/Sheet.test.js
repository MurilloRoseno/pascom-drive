const {
  getSheet,
  registrarFoto,
  listarPagamentosConfirmados,
  atualizarCelula,
  incrementarTentativas,
} = require('../Sheet');

beforeEach(() => jest.clearAllMocks());

describe('getSheet', () => {
  it('opens spreadsheet by SPREADSHEET_ID and returns Fotos sheet', () => {
    getSheet();
    expect(SpreadsheetApp.openById).toHaveBeenCalledWith('spreadsheet-id-test');
    expect(__mockSpreadsheet__.getSheetByName).toHaveBeenCalledWith('Fotos');
  });
});

describe('registrarFoto', () => {
  it('appendRow with all 12 columns', () => {
    registrarFoto({
      id: 'FOTO_001',
      evento: 'Batizado',
      linkOriginal: 'https://link-orig',
      linkAmostra: 'https://link-amostra',
      preco: 25,
    });
    expect(__mockSheet__.appendRow).toHaveBeenCalledWith([
      'FOTO_001', 'Batizado', 'https://link-orig', 'https://link-amostra',
      'Processada', '', 25, '', expect.any(String), '', '', 0,
    ]);
  });
});

describe('listarPagamentosConfirmados', () => {
  it('returns rows with Status = "Pagamento Confirmado"', () => {
    __mockSheet__.getDataRange.mockReturnValueOnce({
      getValues: jest.fn().mockReturnValue([
        ['ID','Evento','LO','LA','Status','WA','TP','IMP','DP','DPag','LE','TE'],
        ['FOTO_001','Batizado','lo','la','Pagamento Confirmado','5511999999999','25','','d1','','','0'],
        ['FOTO_002','Missa','lo','la','Processada','','25','','d2','','','0'],
      ]),
    });
    const rows = listarPagamentosConfirmados();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('FOTO_001');
    expect(rows[0].whatsapp).toBe('5511999999999');
    expect(rows[0].rowIndex).toBe(2);
  });

  it('returns empty array when no confirmed payments', () => {
    __mockSheet__.getDataRange.mockReturnValueOnce({
      getValues: jest.fn().mockReturnValue([
        ['ID','Evento','LO','LA','Status','WA','TP','IMP','DP','DPag','LE','TE'],
        ['FOTO_001','Batizado','lo','la','Processada','','25','','d1','','','0'],
      ]),
    });
    expect(listarPagamentosConfirmados().length).toBe(0);
  });
});

describe('atualizarCelula', () => {
  it('calls getRange(row, col) and setValue', () => {
    atualizarCelula(3, 5, 'Entregue');
    expect(__mockSheet__.getRange).toHaveBeenCalledWith(3, 5);
    expect(__mockRange__.setValue).toHaveBeenCalledWith('Entregue');
  });
});

describe('incrementarTentativas', () => {
  it('reads col 12 value and increments by 1', () => {
    __mockRange__.getValue.mockReturnValueOnce(2);
    incrementarTentativas(5);
    expect(__mockSheet__.getRange).toHaveBeenCalledWith(5, 12);
    expect(__mockRange__.setValue).toHaveBeenCalledWith(3);
  });

  it('treats blank as 0 and sets to 1', () => {
    __mockRange__.getValue.mockReturnValueOnce('');
    incrementarTentativas(6);
    expect(__mockRange__.setValue).toHaveBeenCalledWith(1);
  });
});
