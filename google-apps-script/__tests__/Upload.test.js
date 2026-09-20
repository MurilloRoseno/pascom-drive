const crypto = require('crypto');

const SECRET = 'segredo-upload';
const cacheStore = new Map();

global.CacheService = {
  getScriptCache: () => ({
    get: (key) => cacheStore.get(key) || null,
    put: (key, value) => cacheStore.set(key, value),
  }),
};
global.ContentService = {
  MimeType: { JSON: 'json' },
  createTextOutput: jest.fn((text) => ({ text, setMimeType() { return this; } })),
};
global.UrlFetchApp = { fetchAll: jest.fn() };
global.ScriptApp.getOAuthToken = jest.fn(() => 'owner-token');
global.ensureSheet = jest.fn(() => ({}));
global.appendMappedRow = jest.fn();
global.notificarAdministracao = jest.fn();
global.getEventosSheet = jest.fn(() => ({
  getDataRange: () => ({ getValues: () => [['EventoID', 'NomePasta'], ['EV1', 'batismo__2026-01-10__batizados-de-janeiro']] }),
}));

const upload = require('../Upload');

function iterator(items) {
  let index = 0;
  return { hasNext: () => index < items.length, next: () => items[index++] };
}

function file(name) {
  return { name, getName() { return this.name; }, setName: jest.fn(function (next) { this.name = next; }) };
}

let source;
let envio;
let files;

function folder(id, name, extra = {}) {
  return {
    name,
    getId: () => id,
    getName() { return this.name; },
    setName: jest.fn(function (next) { this.name = next; }),
    isTrashed: () => false,
    setTrashed: jest.fn(),
    getParents: () => iterator([source]),
    ...extra,
  };
}

function assinar(acao, payload, timestamp = Date.now()) {
  const body = JSON.stringify(payload);
  const assinatura = crypto.createHmac('sha256', SECRET).update(`${timestamp}.${acao}.${body}`).digest('hex');
  return { postData: { contents: JSON.stringify({ acao, timestamp, payload: body, assinatura }) } };
}

function resposta(output) {
  return JSON.parse(output.text);
}

beforeEach(() => {
  jest.clearAllMocks();
  cacheStore.clear();
  PropertiesService.getScriptProperties.mockReturnValue({
    getProperty: (key) => ({ SOURCE_FOLDER_ID: 'source', APPS_SCRIPT_HMAC_SECRET: SECRET }[key] || null),
  });
  files = [file('IMG_1.jpg'), file('IMG_2.jpg')];
  source = {
    getId: () => 'source',
    getFoldersByName: jest.fn(() => iterator([])),
    createFolder: jest.fn((name) => folder('novo-envio', name)),
    getFolders: jest.fn(() => iterator([])),
  };
  envio = folder('envio-1', '_ENVIANDO__casamento__2026-05-20__joao-e-maria', { getFiles: () => iterator(files) });
  DriveApp.getFolderById.mockImplementation((id) => {
    if (id === 'source') return source;
    if (id === 'envio-1') return envio;
    throw new Error('not found');
  });
  DriveApp.getStorageUsed = jest.fn(() => 1000);
  DriveApp.getStorageLimit = jest.fn(() => 15 * 1024 ** 3);
});

it('monta nome de pasta no padrao operacional a partir do formulario', () => {
  expect(upload.slugTituloEvento('  João & Maria — Casamento!  ')).toBe('joão-maria-casamento');
  expect(upload.montarNomePastaEvento({ categoria: 'casamento', data: '2026-05-20', titulo: 'João e Maria' }))
    .toBe('casamento__2026-05-20__joão-e-maria');
  expect(() => upload.montarNomePastaEvento({ categoria: 'formatura', data: '2026-05-20', titulo: 'x' })).toThrow();
});

it('rejeita envelope sem assinatura valida, expirado ou repetido', () => {
  const invalido = assinar('criarEvento', {});
  const envelope = JSON.parse(invalido.postData.contents);
  envelope.assinatura = 'x'.repeat(64);
  expect(resposta(upload.doPost({ postData: { contents: JSON.stringify(envelope) } }))).toEqual(
    expect.objectContaining({ ok: false, codigo: 'assinatura_invalida' })
  );

  expect(resposta(upload.doPost(assinar('armazenamento', {}, Date.now() - 10 * 60 * 1000))).codigo)
    .toBe('assinatura_invalida');

  const valido = assinar('armazenamento', {});
  expect(resposta(upload.doPost(valido)).ok).toBe(true);
  expect(resposta(upload.doPost(valido)).codigo).toBe('assinatura_invalida');
});

it('cria pasta de envio com prefixo que o trigger ignora e registra auditoria', () => {
  const result = resposta(upload.doPost(assinar('criarEvento', {
    categoria: 'casamento', data: '2026-05-20', titulo: 'Joao e Maria', quem: 'pascom@paroquia.test', totalArquivos: 2,
  })));
  expect(result.ok).toBe(true);
  expect(source.createFolder).toHaveBeenCalledWith('_ENVIANDO__casamento__2026-05-20__joao-e-maria');
  expect(result.data).toEqual(expect.objectContaining({ uploadId: 'novo-envio', nomePasta: 'casamento__2026-05-20__joao-e-maria' }));
  expect(global.appendMappedRow).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ Status: 'enviando', Quem: 'pascom@paroquia.test' }));
});

it('bloqueia evento duplicado e envio maior que o espaco livre', () => {
  expect(() => upload.uploadCriarEvento({ categoria: 'batismo', data: '2026-01-10', titulo: 'Batizados de Janeiro' }))
    .toThrow(/Ja existe/);
  DriveApp.getStorageLimit.mockReturnValue(2000);
  expect(() => upload.uploadCriarEvento({ categoria: 'casamento', data: '2026-05-20', titulo: 'Joao', bytesTotais: 5000 }))
    .toThrow(/espaco livre/);
});

it('abre sessoes retomaveis como dono do Drive com a origem do navegador', () => {
  UrlFetchApp.fetchAll.mockReturnValue([{
    getResponseCode: () => 200,
    getHeaders: () => ({ Location: 'https://www.googleapis.com/upload/drive/v3/files?upload_id=abc' }),
    getContentText: () => '',
  }]);
  const result = upload.uploadCriarSessoes({
    uploadId: 'envio-1',
    origem: 'https://pascom-drive.vercel.app',
    arquivos: [{ nome: 'IMG_1.jpg', mimeType: 'image/jpeg', tamanho: 1234 }],
  });
  const [request] = UrlFetchApp.fetchAll.mock.calls[0][0];
  expect(request.headers).toEqual(expect.objectContaining({
    Authorization: 'Bearer owner-token',
    Origin: 'https://pascom-drive.vercel.app',
    'X-Upload-Content-Length': '1234',
  }));
  expect(JSON.parse(request.payload)).toEqual({ name: 'IMG_1.jpg', parents: ['envio-1'], mimeType: 'image/jpeg' });
  expect(result.sessoes[0].sessionUrl).toContain('upload_id=abc');
});

it('recusa formatos fora de JPG/PNG, arquivos grandes e pastas que nao sao envios', () => {
  const base = { uploadId: 'envio-1', origem: 'https://pascom-drive.vercel.app' };
  expect(() => upload.uploadCriarSessoes({ ...base, arquivos: [{ nome: 'a.heic', mimeType: 'image/heic', tamanho: 10 }] }))
    .toThrow(/Formato/);
  expect(() => upload.uploadCriarSessoes({ ...base, arquivos: [{ nome: 'a.jpg', mimeType: 'image/jpeg', tamanho: 41 * 1024 * 1024 }] }))
    .toThrow(/Tamanho/);
  envio.name = 'casamento__2026-05-20__joao-e-maria';
  expect(() => upload.uploadCriarSessoes({ ...base, arquivos: [{ nome: 'a.jpg', mimeType: 'image/jpeg', tamanho: 10 }] }))
    .toThrow(/nao esta mais aberto/);
});

it('finaliza renomeando capa escolhida e liberando a pasta para o trigger', () => {
  files.push(file('capa.jpg'));
  const result = upload.uploadFinalizar({ uploadId: 'envio-1', capa: 'IMG_2.jpg', esperados: 3 });
  expect(files[1].name).toBe('capa.jpg');
  expect(files[2].name).toBe('foto-capa.jpg');
  expect(envio.name).toBe('casamento__2026-05-20__joao-e-maria');
  expect(result).toEqual({ nomePasta: 'casamento__2026-05-20__joao-e-maria', arquivos: 3 });
});

it('nao finaliza enquanto faltarem fotos', () => {
  expect(() => upload.uploadFinalizar({ uploadId: 'envio-1', esperados: 5 })).toThrow(/Chegaram 2 de 5/);
  expect(envio.name.startsWith('_ENVIANDO__')).toBe(true);
});

it('move para a lixeira envios abertos ha mais de 48h', () => {
  const antigo = folder('velho', '_ENVIANDO__crisma__2026-01-01__turma', { getDateCreated: () => new Date(Date.now() - 49 * 3600 * 1000) });
  const recente = folder('novo', '_ENVIANDO__crisma__2026-01-02__turma', { getDateCreated: () => new Date() });
  const normal = folder('normal', 'crisma__2026-01-03__turma', { getDateCreated: () => new Date(0) });
  source.getFolders.mockReturnValue(iterator([antigo, recente, normal]));
  expect(upload.limparEnviosAbandonados()).toEqual(['_ENVIANDO__crisma__2026-01-01__turma']);
  expect(antigo.setTrashed).toHaveBeenCalledWith(true);
  expect(recente.setTrashed).not.toHaveBeenCalled();
  expect(normal.setTrashed).not.toHaveBeenCalled();
});
