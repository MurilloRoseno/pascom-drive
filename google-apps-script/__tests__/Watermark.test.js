// Watermark.test.js
const {
  gerarIdFoto,
  gerarNomeAmostra,
  ehArquivoCapa,
  processarFoto,
} = require('../Watermark');

const mockCopyFileToFolder  = jest.fn();
const mockGetShareableLink  = jest.fn();
const mockGetOriginaisFolder = jest.fn();
const mockGetAmostrasFolder  = jest.fn();
const mockGetThumbnailsFolder = jest.fn();
const mockTrashFileById       = jest.fn();
const mockRegistrarFoto      = jest.fn();
const mockAtualizarDerivadosFoto = jest.fn().mockReturnValue(true);
const mockListarFotosParaReprocessar = jest.fn();
const mockInvalidarCacheSite = jest.fn();

jest.mock('../Drive', () => ({
  copyFileToFolder:   (...a) => mockCopyFileToFolder(...a),
  getShareableLink:   (...a) => mockGetShareableLink(...a),
  getOriginaisFolder: (...a) => mockGetOriginaisFolder(...a),
  getAmostrasFolder:  (...a) => mockGetAmostrasFolder(...a),
  getThumbnailsFolder: (...a) => mockGetThumbnailsFolder(...a),
  trashFileById:       (...a) => mockTrashFileById(...a),
}));
jest.mock('../Sheet', () => ({
  registrarFoto: (...a) => mockRegistrarFoto(...a),
  atualizarDerivadosFoto: (...a) => mockAtualizarDerivadosFoto(...a),
  listarFotosParaReprocessar: (...a) => mockListarFotosParaReprocessar(...a),
  invalidarCacheSite: (...a) => mockInvalidarCacheSite(...a),
}));

global.UrlFetchApp = { fetch: jest.fn() };

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn((key) => {
      const props = {
        BACKEND_URL:           'https://pascom-drive.vercel.app',
        ADMIN_EMAIL:           'admin@example.com',
        WATERMARK_API_SECRET:  'test-watermark-secret',
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

describe('ehArquivoCapa', () => {
  it('reconhece somente arquivo editorial nomeado capa', () => {
    expect(ehArquivoCapa('capa.jpg')).toBe(true);
    expect(ehArquivoCapa('Capa.PNG')).toBe(true);
    expect(ehArquivoCapa('capa-foto.jpg')).toBe(false);
  });
});

describe('processarFoto', () => {
  let mockArquivo, mockAmostraFile, mockAmostrasFolder, mockThumbnailFile, mockThumbnailsFolder;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockOriginaisFolder = { getId: () => 'originais-folder-id' };
    mockGetOriginaisFolder.mockReturnValue(mockOriginaisFolder);

    mockAmostraFile  = { getId: jest.fn().mockReturnValue('amostra-file-id') };
    mockAmostrasFolder = { createFile: jest.fn().mockReturnValue(mockAmostraFile) };
    mockGetAmostrasFolder.mockReturnValue(mockAmostrasFolder);
    mockThumbnailFile = { getId: jest.fn().mockReturnValue('thumbnail-file-id') };
    mockThumbnailsFolder = { createFile: jest.fn().mockReturnValue(mockThumbnailFile) };
    mockGetThumbnailsFolder.mockReturnValue(mockThumbnailsFolder);
    mockAtualizarDerivadosFoto.mockReturnValue(true);

    mockArquivo = {
      getId:      jest.fn().mockReturnValue('file-drive-id'),
      getName:    jest.fn().mockReturnValue('foto.jpg'),
      getParents: jest.fn().mockReturnValue({
        hasNext: jest.fn().mockReturnValue(true),
        next:    jest.fn().mockReturnValue({ getName: () => 'Evento2026' }),
      }),
      moveTo: jest.fn(),
      setTrashed: jest.fn(),
    };

    const mockCopiaOriginal = { getId: jest.fn().mockReturnValue('copia-original-id') };
    mockCopyFileToFolder.mockReturnValue(mockCopiaOriginal);
    mockGetShareableLink.mockReturnValue('https://drive.google.com/file/d/copia-original-id/view');

    // First call: preprocess → 200
    // Second call: watermark → 200 with blob
    const mockBlob = { setName: jest.fn() };
    global.UrlFetchApp.fetch
      .mockReturnValueOnce({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText:  jest.fn().mockReturnValue('{"skipped":false,"originalSize":5000000,"processedSize":500000}'),
        getBlob:         jest.fn().mockReturnValue(null),
      })
      .mockReturnValueOnce({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText:  jest.fn().mockReturnValue(''),
        getBlob:         jest.fn().mockReturnValue(mockBlob),
      })
      .mockReturnValueOnce({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText:  jest.fn().mockReturnValue(''),
        getBlob:         jest.fn().mockReturnValue({ setName: jest.fn() }),
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

  it('calls backend /api/watermark with preview and thumbnail variants', () => {
    processarFoto(mockArquivo);
    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      'https://pascom-drive.vercel.app/api/watermark',
      expect.objectContaining({
        method:  'POST',
        payload: expect.stringContaining('"fileId":"file-drive-id"'),
      })
    );
    const fetchCall = UrlFetchApp.fetch.mock.calls[1];
    const fetchOptions = fetchCall[1];
    expect(fetchOptions.headers['x-watermark-secret']).toBeDefined();
    expect(fetchOptions.payload).toContain('"variant":"preview"');
    expect(UrlFetchApp.fetch.mock.calls[2][1].payload).toContain('"variant":"thumbnail"');
  });

  it('gera capa editorial sem solicitar watermark e a marca como nao vendavel', () => {
    mockArquivo.getName.mockReturnValueOnce('capa.jpg');
    processarFoto(mockArquivo, 'EV1', 1);
    expect(global.UrlFetchApp.fetch.mock.calls[1][0]).toContain('/api/cover-preview');
    expect(mockRegistrarFoto).toHaveBeenCalledWith(expect.objectContaining({ tipoFoto: 'capa' }));
  });

  it('saves returned blob to AMOSTRAS folder via createFile', () => {
    processarFoto(mockArquivo);
    expect(mockAmostrasFolder.createFile).toHaveBeenCalled();
    expect(mockThumbnailsFolder.createFile).toHaveBeenCalled();
  });

  it('registers foto with linkAmostra derived from saved file id', () => {
    processarFoto(mockArquivo);
    expect(mockRegistrarFoto).toHaveBeenCalledWith(
      expect.objectContaining({
        linkAmostra: expect.stringContaining('amostra-file-id'),
        originalFileId: 'copia-original-id',
        previewFileId: 'amostra-file-id',
        thumbnailFileId: 'thumbnail-file-id',
      })
    );
  });

  it('removes the processed source file after preserving the private original', () => {
    processarFoto(mockArquivo);
    expect(mockArquivo.setTrashed).toHaveBeenCalledWith(true);
  });

  it('keeps the source file available when registering the processed photo fails', () => {
    mockRegistrarFoto.mockImplementationOnce(() => {
      throw new Error('Validacao da planilha bloqueou a linha');
    });

    expect(() => processarFoto(mockArquivo)).toThrow('Validacao da planilha bloqueou a linha');
    expect(mockArquivo.setTrashed).not.toHaveBeenCalled();
    expect(mockTrashFileById).toHaveBeenCalledWith('amostra-file-id');
    expect(mockTrashFileById).toHaveBeenCalledWith('thumbnail-file-id');
    expect(mockTrashFileById).toHaveBeenCalledWith('copia-original-id');
  });

  it('sends admin email and reports API failure to the event orchestrator', () => {
    const errorResponse = {
      getResponseCode: jest.fn().mockReturnValue(500),
      getContentText:  jest.fn().mockReturnValue('Internal Server Error'),
      getBlob:         jest.fn().mockReturnValue(null),
    };
    global.UrlFetchApp.fetch
      .mockReset()
      .mockReturnValue(errorResponse);
    expect(() => processarFoto(mockArquivo)).toThrow('Preprocess API falhou');
    expect(global.MailApp.sendEmail).toHaveBeenCalledWith(
      'admin@example.com',
      expect.stringContaining('foto.jpg'),
      expect.any(String)
    );
  });

  it('does NOT remove arquivo when API fails (source file stays for retry)', () => {
    const errorResponse = {
      getResponseCode: jest.fn().mockReturnValue(500),
      getContentText:  jest.fn().mockReturnValue('error'),
      getBlob:         jest.fn().mockReturnValue(null),
    };
    global.UrlFetchApp.fetch
      .mockReset()
      .mockReturnValue(errorResponse);
    expect(() => processarFoto(mockArquivo)).toThrow('Preprocess API falhou');
    expect(mockArquivo.setTrashed).not.toHaveBeenCalled();
  });

  it('preserves the processing error when sending the admin email is not authorized', () => {
    global.UrlFetchApp.fetch
      .mockReset()
      .mockReturnValue({
        getResponseCode: jest.fn().mockReturnValue(500),
        getContentText: jest.fn().mockReturnValue('backend unavailable'),
        getBlob: jest.fn().mockReturnValue(null),
      });
    global.MailApp.sendEmail.mockImplementationOnce(() => {
      throw new Error('Specified permissions are not sufficient to call MailApp.sendEmail.');
    });

    expect(() => processarFoto(mockArquivo)).toThrow('Preprocess API falhou');
    expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Aviso por e-mail nao enviado'));
  });

  it('calls /api/preprocess before /api/watermark', () => {
    processarFoto(mockArquivo);
    expect(global.UrlFetchApp.fetch.mock.calls[0][0]).toContain('/api/preprocess');
    expect(global.UrlFetchApp.fetch.mock.calls[1][0]).toContain('/api/watermark');
  });

  it('continues normally when preprocess returns 422 (unsupported format)', () => {
    global.UrlFetchApp.fetch
      .mockReturnValueOnce({
        getResponseCode: jest.fn().mockReturnValue(422),
        getContentText:  jest.fn().mockReturnValue('{"error":"Formato não suportado"}'),
        getBlob:         jest.fn().mockReturnValue(null),
      })
      .mockReturnValueOnce({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText:  jest.fn().mockReturnValue(''),
        getBlob:         jest.fn().mockReturnValue({ setName: jest.fn() }),
      })
      .mockReturnValueOnce({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText:  jest.fn().mockReturnValue(''),
        getBlob:         jest.fn().mockReturnValue({ setName: jest.fn() }),
      });
    processarFoto(mockArquivo);
    // Should still copy original and create amostra — no error
    expect(mockCopyFileToFolder).toHaveBeenCalled();
    expect(mockAmostrasFolder.createFile).toHaveBeenCalled();
  });
});
