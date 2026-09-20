const crypto = require('crypto');

const EVENTOS = [
  'EventoID', 'NomePasta', 'Titulo', 'Categoria', 'DataEvento', 'HorarioEvento', 'StatusProcessamento',
  'Visibilidade', 'VendaAutorizada', 'Publicacao', 'ProtecaoMenores', 'CodigoHash', 'CodigoVersao',
  'CodigoGeradoEm', 'CodigoRevogadoEm', 'DataPublicacao', 'SlugPublico',
];
const FOTOS = ['FotoID', 'EventoID', 'TipoFoto', 'DisponivelVenda'];

function fakeSheet(values) {
  return {
    values,
    getDataRange() { return { getValues: () => this.values.map((row) => row.slice()) }; },
    getRange(row, col) {
      return {
        setValue: (value) => {
          while (this.values.length < row) this.values.push([]);
          this.values[row - 1][col - 1] = value;
        },
      };
    },
    appendRow(row) { this.values.push(row); },
    setFrozenRows() {},
  };
}

function evento(overrides = {}) {
  const base = {
    EventoID: 'EV1', NomePasta: 'casamento__2026-05-20__joao', Titulo: 'Joao', Categoria: 'casamento',
    DataEvento: '2026-05-20', HorarioEvento: '', StatusProcessamento: 'Processado', Visibilidade: 'protegida',
    VendaAutorizada: 'NAO', Publicacao: 'rascunho', ProtecaoMenores: 'NAO', CodigoHash: '', CodigoVersao: 1,
    CodigoGeradoEm: '', CodigoRevogadoEm: '', DataPublicacao: '', SlugPublico: 'joao',
  };
  const merged = { ...base, ...overrides };
  return EVENTOS.map((header) => merged[header]);
}

let sheets;

function field(sheetName, rowIndex, header) {
  const sheet = sheets[sheetName];
  return sheet.values[rowIndex][sheet.values[0].indexOf(header)];
}

beforeEach(() => {
  jest.clearAllMocks();
  sheets = {
    Eventos: fakeSheet([EVENTOS.slice(), evento(), evento({ EventoID: 'EV2', SlugPublico: 'outro', ProtecaoMenores: 'SIM' })]),
    Fotos: fakeSheet([FOTOS.slice(), ['F1', 'EV1', 'foto', 'NAO'], ['F2', 'EV1', 'capa', 'NAO'], ['F3', 'EV2', 'foto', 'NAO']]),
    AuditoriaPascom: fakeSheet([['Quando', 'Quem', 'Acao', 'EventoID', 'Detalhe']]),
  };
  SpreadsheetApp.openById.mockReturnValue({
    getSheetByName: (name) => sheets[name] || null,
    insertSheet: (name) => { sheets[name] = fakeSheet([]); return sheets[name]; },
  });
  PropertiesService.getScriptProperties.mockReturnValue({
    getProperty: (key) => ({ SPREADSHEET_ID: 'sheet', GALLERY_CODE_SALT: 'sal', APPS_SCRIPT_HMAC_SECRET: 'segredo', SOURCE_FOLDER_ID: 'source' }[key] || null),
  });
  global.Utilities.getUuid = jest.fn(() => 'abcd1234-ef56-7890-abcd-1234567890ab');
  global.Utilities.DigestAlgorithm = { SHA_256: 'sha256' };
  global.Utilities.computeDigest = jest.fn((_alg, text) => Array.from(crypto.createHash('sha256').update(text).digest()));
  global.LockService = { getScriptLock: () => ({ waitLock: jest.fn(), releaseLock: jest.fn() }) };
});

const { EVENTO_ACOES } = require('../EventAdmin');
const sheetModule = require('../Sheet');

it('publica pelo EventoID, grava DataPublicacao e registra auditoria sem precisar de linha selecionada', () => {
  EVENTO_ACOES.publicar({ eventoId: 'EV1', quem: 'pascom@paroquia.test' });
  expect(field('Eventos', 1, 'Publicacao')).toBe('publicado');
  expect(field('Eventos', 1, 'DataPublicacao')).toMatch(/^\d{4}-/);
  const auditoria = sheets.AuditoriaPascom.values[1];
  expect(auditoria.slice(1, 4)).toEqual(['pascom@paroquia.test', 'publicar', 'EV1']);
});

it('recusa publicar sem data ou durante o processamento, com codigo de regra de negocio', () => {
  sheets.Eventos.values[1] = evento({ DataEvento: '' });
  expect(() => sheetModule.publicarEvento('EV1')).toThrow(expect.objectContaining({ codigo: 'regra_negocio' }));
  sheets.Eventos.values[1] = evento({ StatusProcessamento: 'Processando' });
  expect(() => sheetModule.publicarEvento('EV1')).toThrow(/processamento/);
  expect(() => sheetModule.publicarEvento('NAO_EXISTE')).toThrow(expect.objectContaining({ codigo: 'evento_nao_encontrado' }));
});

it('liberar venda propaga DisponivelVenda para as fotos, mas nunca para a capa', () => {
  EVENTO_ACOES.autorizarVenda({ eventoId: 'EV1' });
  expect(field('Eventos', 1, 'VendaAutorizada')).toBe('SIM');
  expect(field('Fotos', 1, 'DisponivelVenda')).toBe('SIM');
  expect(field('Fotos', 2, 'DisponivelVenda')).toBe('NAO');
  expect(field('Fotos', 3, 'DisponivelVenda')).toBe('NAO');
});

it('evento com menores nao pode ficar publico', () => {
  expect(() => EVENTO_ACOES.definirVisibilidade({ eventoId: 'EV2', visibilidade: 'publica' })).toThrow(/menores/);
  expect(field('Eventos', 2, 'Visibilidade')).toBe('protegida');
});

it('gera codigo devolvendo o valor uma vez, salva so o hash e nao registra o codigo na auditoria', () => {
  const result = EVENTO_ACOES.gerarCodigo({ eventoId: 'EV1', quem: 'x' });
  expect(result.codigo).toBe('ABCD1234');
  expect(field('Eventos', 1, 'CodigoHash')).toBe(crypto.createHash('sha256').update('ABCD1234sal').digest('hex'));
  expect(field('Eventos', 1, 'CodigoVersao')).toBe(2);
  expect(JSON.stringify(sheets.AuditoriaPascom.values)).not.toContain('ABCD1234');
  expect(sheets.AuditoriaPascom.values[1][4]).toBe('versao 2');
});

it('edita apenas campos permitidos, valida link unico e fecha a galeria ao ligar protecao de menores', () => {
  sheets.Eventos.values[1] = evento({ Visibilidade: 'publica', VendaAutorizada: 'SIM' });
  EVENTO_ACOES.editar({ eventoId: 'EV1', campos: { Titulo: 'Casamento Joao e Maria', HorarioEvento: '19:30', ProtecaoMenores: 'SIM' } });
  expect(field('Eventos', 1, 'Titulo')).toBe('Casamento Joao e Maria');
  expect(field('Eventos', 1, 'HorarioEvento')).toBe('19:30');
  expect(field('Eventos', 1, 'Visibilidade')).toBe('protegida');
  expect(field('Eventos', 1, 'VendaAutorizada')).toBe('NAO');

  expect(() => sheetModule.editarEvento('EV1', { SlugPublico: 'outro' })).toThrow(/ja e usado/);
  expect(() => sheetModule.editarEvento('EV1', { CodigoHash: 'x' })).toThrow(/nao editavel/);
  expect(() => sheetModule.editarEvento('EV1', { HorarioEvento: '25:00' })).toThrow(/Horario/);
});

it('arquivar encerra a venda', () => {
  sheets.Eventos.values[1] = evento({ Publicacao: 'publicado', VendaAutorizada: 'SIM' });
  EVENTO_ACOES.arquivar({ eventoId: 'EV1' });
  expect(field('Eventos', 1, 'Publicacao')).toBe('arquivado');
  expect(field('Eventos', 1, 'VendaAutorizada')).toBe('NAO');
});

it('o doPost do Web App despacha acoes de evento e ignora nomes herdados do prototipo', () => {
  global.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
  global.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) };
  const { doPost } = require('../Upload');
  const call = (acao, payload) => {
    const body = JSON.stringify(payload);
    const timestamp = Date.now();
    const assinatura = crypto.createHmac('sha256', 'segredo').update(`${timestamp}.${acao}.${body}`).digest('hex');
    return JSON.parse(doPost({ postData: { contents: JSON.stringify({ acao, timestamp, payload: body, assinatura }) } }).text);
  };
  expect(call('gerarCodigo', { eventoId: 'EV1' })).toEqual({ ok: true, data: { codigo: 'ABCD1234', versao: 2 } });
  expect(call('toString', {})).toEqual(expect.objectContaining({ ok: false, codigo: 'acao_invalida' }));
  expect(call('publicar', { eventoId: '../x' })).toEqual(expect.objectContaining({ ok: false, codigo: 'dados_invalidos' }));
});
