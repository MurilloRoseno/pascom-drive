// Watermark.test.js
const {
  gerarIdFoto,
  gerarNomeAmostra,
  processarFoto,
} = require('../Watermark');

const mockCopyFileToFolder = jest.fn();
const mockGetShareableLink = jest.fn();
const mockGetOriginaisFolder = jest.fn();
const mockRegistrarFoto = jest.fn();

jest.mock('../Drive', () => ({
  copyFileToFolder: (...a) => mockCopyFileToFolder(...a),
  getShareableLink: (...a) => mockGetShareableLink(...a),
  getOriginaisFolder: (...a) => mockGetOriginaisFolder(...a),
  getAmostrasFolder: jest.fn(),
}));
jest.mock('../Sheet', () => ({
  registrarFoto: (...a) => mockRegistrarFoto(...a),
}));

global.UrlFetchApp = { fetch: jest.fn() };

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn((key) => {
      const props = {
        BACKEND_URL:        'https://pascom-drive.vercel.app',
        AMOSTRAS_FOLDER_ID: 'amostras-folder-id',
        ADMIN_EMAIL:        'admin@example.com',
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
  let mockArquivo;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockOriginaisFolder = { getId: () => 'originais-folder-id' };
    mockGetOriginaisFolder.mockReturnValue(mockOriginaisFolder);

    mockArquivo = {
      getId: jest.fn().mockReturnValue('file-drive-id'),
      getName: jest.fn().mockReturnValue('foto.jpg'),
      getParents: jest.fn().mockReturnValue({
        hasNext: jest.fn().mockReturnValue(true),
        next: jest.fn().mockReturnValue({ getName: () => 'Evento2026' }),
      }),
      moveTo: jest.fn(),
    };

    const mockCopiaOriginal = { getId: jest.fn().mockReturnValue('copia-original-id') };
    mockCopyFileToFolder.mockReturnValue(mockCopiaOriginal);
    mockGetShareableLink.mockReturnValue('https://drive.google.com/file/d/copia-original-id/view');

    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(200),
      getContentText: jest.fn().mockReturnValue(
        JSON.stringify({ linkAmostra: 'https://drive.google.com/file/d/amostra-id/view' })
      ),
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

  it('calls backend /api/watermark with correct payload', () => {
    processarFoto(mockArquivo);
    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      'https://pascom-drive.vercel.app/api/watermark',
      expect.objectContaining({
        method: 'POST',
        payload: expect.stringContaining('"fileId":"file-drive-id"'),
      })
    );
  });

  it('moves the arquivo to ORIGINAIS folder after success (prevents duplicate processing)', () => {
    processarFoto(mockArquivo);
    expect(mockArquivo.moveTo).toHaveBeenCalledWith(expect.anything());
  });

  it('registers foto with linkAmostra from API response', () => {
    processarFoto(mockArquivo);
    expect(mockRegistrarFoto).toHaveBeenCalledWith(
      expect.objectContaining({
        linkAmostra: 'https://drive.google.com/file/d/amostra-id/view',
      })
    );
  });

  it('sends admin email on API error instead of throwing', () => {
    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(500),
      getContentText: jest.fn().mockReturnValue('Internal Server Error'),
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
      getContentText: jest.fn().mockReturnValue('error'),
    });
    processarFoto(mockArquivo);
    expect(mockArquivo.moveTo).not.toHaveBeenCalled();
  });
});
