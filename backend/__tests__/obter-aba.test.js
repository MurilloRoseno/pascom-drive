jest.mock('google-spreadsheet', () => ({ GoogleSpreadsheet: jest.fn() }));
jest.mock('google-auth-library', () => ({ JWT: jest.fn() }));

const { GoogleSpreadsheet } = require('google-spreadsheet');

const doc = {
  loadInfo: jest.fn().mockResolvedValue(undefined),
  sheetsByTitle: {},
  addSheet: jest.fn(),
};
GoogleSpreadsheet.mockImplementation(() => doc);

const { obterAba } = require('../lib/google-sheets');

beforeEach(() => {
  jest.clearAllMocks();
  doc.sheetsByTitle = {};
});

function abaExistente(cabecalhos, { colunas = 26, linhas = 1000 } = {}) {
  return {
    headerValues: cabecalhos,
    columnCount: colunas,
    rowCount: linhas,
    loadHeaderRow: jest.fn().mockResolvedValue(undefined),
    setHeaderRow: jest.fn().mockResolvedValue(undefined),
    resize: jest.fn().mockResolvedValue(undefined),
  };
}

describe('obterAba', () => {
  it('cria a aba com os cabeçalhos quando ela não existe', async () => {
    const nova = { title: 'Categorias' };
    doc.addSheet.mockResolvedValue(nova);
    const aba = await obterAba('Categorias', ['Id', 'Nome']);
    expect(aba).toBe(nova);
    expect(doc.addSheet).toHaveBeenCalledWith({ title: 'Categorias', headerValues: ['Id', 'Nome'] });
  });

  it('devolve a aba existente sem mexer quando não se pedem cabeçalhos', async () => {
    const fotos = abaExistente([]);
    doc.sheetsByTitle = { Fotos: fotos };
    expect(await obterAba('Fotos', [])).toBe(fotos);
    expect(fotos.loadHeaderRow).not.toHaveBeenCalled();
  });

  it('acrescenta ao final os cabeçalhos que faltam, sem tocar nos antigos', async () => {
    const eventos = abaExistente(['EventoID', 'Status']);
    doc.sheetsByTitle = { EventosA: eventos };
    await obterAba('EventosA', ['EventoID', 'Status', 'Categoria', 'PublicarEm']);
    expect(eventos.setHeaderRow).toHaveBeenCalledWith(['EventoID', 'Status', 'Categoria', 'PublicarEm']);
    expect(eventos.resize).not.toHaveBeenCalled();
  });

  it('aumenta a grade antes de gravar quando as colunas novas não cabem (aba de 26 colunas cheia)', async () => {
    const cheia = abaExistente(Array.from({ length: 26 }, (_, i) => `C${i}`));
    doc.sheetsByTitle = { Cheia: cheia };
    await obterAba('Cheia', [...cheia.headerValues, 'Novo1', 'Novo2']);
    expect(cheia.resize).toHaveBeenCalledWith({ rowCount: 1000, columnCount: 28 });
    expect(cheia.resize.mock.invocationCallOrder[0]).toBeLessThan(cheia.setHeaderRow.mock.invocationCallOrder[0]);
    expect(cheia.setHeaderRow.mock.calls[0][0]).toHaveLength(28);
  });

  it('não reescreve o cabeçalho quando já está completo, e só confere uma vez', async () => {
    const aba = abaExistente(['Chave', 'Valor']);
    doc.sheetsByTitle = { ConfigB: aba };
    await obterAba('ConfigB', ['Chave', 'Valor']);
    await obterAba('ConfigB', ['Chave', 'Valor']);
    expect(aba.setHeaderRow).not.toHaveBeenCalled();
    expect(aba.loadHeaderRow).toHaveBeenCalledTimes(1);
  });
});
