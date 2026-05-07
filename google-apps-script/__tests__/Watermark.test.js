// Watermark.test.js
const {
  gerarIdFoto,
  gerarNomeAmostra,
  processarFoto,
} = require('../Watermark');

const mockCopyFileToFolder  = jest.fn();
const mockGetShareableLink  = jest.fn();
const mockGetOriginaisFolder = jest.fn();
const mockGetAmostrasFolder  = jest.fn();
const mockRegistrarFoto      = jest.fn();

jest.mock('../Drive', () => ({
  copyFileToFolder:   (...a) => mockCopyFileToFolder(...a),
  getShareableLink:   (...a) => mockGetShareableLink(...a),
  getOriginaisFolder: (...a) => mockGetOriginaisFolder(...a),
  getAmostrasFolder:  (...a) => mockGetAmostrasFolder(...a),
}));
jest.mock('../Sheet', () => ({
  registrarFoto: (...a) => mockRegistrarFoto(...a),
}));

global.UrlFetchApp = { fetch: jest.fn() };

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn((key) => {
      const props = {
        BACKEND_URL:  'https://pascom-drive.vercel.app',
        ADMIN_EMAIL:  'admin@example.com',
      };
      return props[key] || null;
    }),
  }),
};

global.MailApp   = { sendEmail: jest.fn() };
global.Utilities = { formatDate: jest.fn().mockReturnValue('01/01/2026 12:00:00') };
global.Logger    = { log: jest.fn() };

describe('gerarIdFoto', () => {
  it('returns a string starting with FOTO_', () => {
    expect(gerarIdFoto()).toMatch(/^FOTO_\d+/);
  });
  it('generates unique IDs on successive calls', () => {
    expect(gerarIdFoto()).not.toBe(gerarIdFoto());
  });
});

describe('gerarNomeAmostra', () => {
  it('prepends [AMOSTRA] to the filename', () => {
    expect(gerarNomeAmostra('foto.jpg')).toBe('[AMOSTRA]foto.jpg');
  });
});

describe('processarFoto', () => {
  let mockArquivo, mockAmostraFile, mockAmostrasFolder;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockOriginaisFolder = { getId: () => 'originais-folder-id' };
    mockGetOriginaisFolder.mockReturnValue(mockOriginaisFolder);

    mockAmostraFile  = { getId: jest.fn().mockReturnValue('amostra-file-id') };
    mockAmostrasFolder = { createFile: jest.fn().mockReturnValue(mockAmostraFile) };
    mockGetAmostrasFolder.mockReturnValue(mockAmostrasFolder);

    mockArquivo = {
      getId:      jest.fn().mockReturnValue('file-drive-id'),
      getName:    jest.fn().mockReturnValue('foto.jpg'),
      getParents: jest.fn().mockReturnValue({
        hasNext: jest.fn().mockReturnValue(true),
        next:    jest.fn().mockReturnValue({ getName: () => 'Evento2026' }),
      }),
      moveTo: jest.fn(),
    };

    const mockCopiaOriginal = { getId: jest.fn().mockReturnValue('copia-original-id') };
    mockCopyFileToFolder.mockReturnValue(mockCopiaOriginal);
    mockGetShareableLink.mockReturnValue('https://drive.google.com/file/d/copia-original-id/view');

    const mockBlob = { setName: jest.fn() };
    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(200),
      getContentText:  jest.fn().mockReturnValue(''),
      getBlob:         jest.fn().mockReturnValue(mockBlob),
    });
  });

  it('copies original to ORIGINAIS folder', () => {
    processarFoto(mockArquivo);
    expect(mockCopyFileToFolder).toHaveBeenCalledWith(
      mockArquivo,
      expect.anything(),
      expect.stringContaining('foto.jpg')
    );
  });

  it('calls backend /api/watermark with fileId in payload', () => {
    processarFoto(mockArquivo);
    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      'https://pascom-drive.vercel.app/api/watermark',
      expect.objectContaining({
        method:  'POST',
        payload: expect.stringContaining('"fileId":"file-drive-id"'),
      })
    );
  });

  it('saves returned blob to AMOSTRAS folder via createFile', () => {
    processarFoto(mockArquivo);
    expect(mockAmostrasFolder.createFile).toHaveBeenCalled();
  });

  it('registers foto with linkAmostra derived from saved file id', () => {
    processarFoto(mockArquivo);
    expect(mockRegistrarFoto).toHaveBeenCalledWith(
      expect.objectContaining({
        linkAmostra: expect.stringContaining('amostra-file-id'),
      })
    );
  });

  it('moves the arquivo to ORIGINAIS folder after success (prevents duplicate processing)', () => {
    processarFoto(mockArquivo);
    expect(mockArquivo.moveTo).toHaveBeenCalled();
  });

  it('sends admin email on API error instead of throwing', () => {
    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(500),
      getContentText:  jest.fn().mockReturnValue('Internal Server Error'),
      getBlob:         jest.fn().mockReturnValue(null),
    });
    processarFoto(mockArquivo);
    expect(global.MailApp.sendEmail).toHaveBeenCalledWith(
      'admin@example.com',
      expect.stringContaining('foto.jpg'),
      expect.any(String)
    );
  });

  it('does NOT move arquivo when API fails (source file stays for retry)', () => {
    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(500),
      getContentText:  jest.fn().mockReturnValue('error'),
      getBlob:         jest.fn().mockReturnValue(null),
    });
    processarFoto(mockArquivo);
    expect(mockArquivo.moveTo).not.toHaveBeenCalled();
  });
});
