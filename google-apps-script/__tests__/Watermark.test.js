// Mock cross-file globals (Drive.js + Sheet.js functions available as globals in Apps Script)
global.getOriginaisFolder = jest.fn();
global.getAmostrasFolder = jest.fn();
global.copyFileToFolder = jest.fn();
global.getShareableLink = jest.fn();
global.registrarFoto = jest.fn();

const { gerarIdFoto, gerarNomeAmostra, processarFoto } = require('../Watermark');

beforeEach(() => {
  jest.clearAllMocks();
  const { mockFile, mockFolder } = global.__mocks__;
  global.getOriginaisFolder.mockReturnValue(mockFolder);
  global.getAmostrasFolder.mockReturnValue(mockFolder);
  global.copyFileToFolder.mockReturnValue(mockFile);
  global.getShareableLink
    .mockReturnValueOnce('https://link-original')
    .mockReturnValueOnce('https://link-amostra');
});

describe('gerarIdFoto', () => {
  it('returns string starting with FOTO_', () => {
    expect(gerarIdFoto()).toMatch(/^FOTO_\d+$/);
  });

  it('returns unique values on successive calls', () => {
    expect(gerarIdFoto()).not.toBe(gerarIdFoto());
  });
});

describe('gerarNomeAmostra', () => {
  it('prepends [AMOSTRA] to the name', () => {
    expect(gerarNomeAmostra('foto.jpg')).toBe('[AMOSTRA]foto.jpg');
  });
});

describe('processarFoto', () => {
  it('copies file to both Originais and Amostras folders', () => {
    const { mockFile } = global.__mocks__;
    processarFoto(mockFile);
    expect(global.copyFileToFolder).toHaveBeenCalledTimes(2);
  });

  it('second copy has [AMOSTRA] prefix in name', () => {
    const { mockFile } = global.__mocks__;
    processarFoto(mockFile);
    const secondArg = global.copyFileToFolder.mock.calls[1][2];
    expect(secondArg).toMatch(/^\[AMOSTRA\]/);
  });

  it('calls registrarFoto with both links', () => {
    const { mockFile } = global.__mocks__;
    processarFoto(mockFile);
    expect(global.registrarFoto).toHaveBeenCalledWith(
      expect.objectContaining({
        linkOriginal: 'https://link-original',
        linkAmostra: 'https://link-amostra',
      })
    );
  });

  it('sends email and does not throw on error', () => {
    global.copyFileToFolder.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(() => processarFoto(global.__mocks__.mockFile)).not.toThrow();
    expect(MailApp.sendEmail).toHaveBeenCalled();
  });
});
