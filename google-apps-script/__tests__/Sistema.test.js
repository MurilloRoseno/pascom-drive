const crypto = require('crypto');

const EVENTOS = [
  'EventoID', 'NomePasta', 'Titulo', 'Categoria', 'DataEvento', 'StatusProcessamento', 'Visibilidade',
  'VendaAutorizada', 'Publicacao', 'ProtecaoMenores', 'SlugPublico',
  'EspacoLiberacao', 'EspacoLiberadoEm', 'EspacoLiberadoBytes',
];
const FOTOS = ['FotoID', 'EventoID', 'OriginalFileID', 'PreviewFileID', 'ThumbnailFileID', 'TipoFoto', 'DisponivelVenda', 'ArquivosLiberados'];

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
    DataEvento: '2026-05-20', StatusProcessamento: 'Processado', Visibilidade: 'protegida', VendaAutorizada: 'NAO',
    Publicacao: 'arquivado', ProtecaoMenores: 'NAO', SlugPublico: 'joao', EspacoLiberacao: '', EspacoLiberadoEm: '',
    EspacoLiberadoBytes: '',
  };
  const merged = { ...base, ...overrides };
  return EVENTOS.map((header) => merged[header]);
}

let sheets;
let files;
let props;
let cacheStore;

function field(sheetName, rowIndex, header) {
  const sheet = sheets[sheetName];
  return sheet.values[rowIndex][sheet.values[0].indexOf(header)];
}

function file(id, size) {
  files[id] = { id, size, trashed: false };
}

function folderIterator(items) {
  let i = 0;
  return { hasNext: () => i < items.length, next: () => items[i++] };
}

beforeEach(() => {
  jest.clearAllMocks();
  files = {};
  cacheStore = {};
  props = {
    SPREADSHEET_ID: 'sheet', SOURCE_FOLDER_ID: 'source', ORIGINAIS_FOLDER_ID: 'orig', AMOSTRAS_FOLDER_ID: 'amostras',
    APPS_SCRIPT_HMAC_SECRET: 'segredo-muito-secreto', ADMIN_EMAIL: 'admin@paroquia.test', GALLERY_CODE_SALT: 'sal',
  };
  // F1 vendida (pedido confirmado), F2 nao vendida, F3 em pedido rejeitado (conta como nao vendida).
  ['O1', 'P1', 'T1', 'O2', 'P2', 'T2', 'O3', 'P3', 'T3'].forEach((id) => file(id, id.startsWith('O') ? 1000 : 100));
  sheets = {
    Eventos: fakeSheet([EVENTOS.slice(), evento(), evento({ EventoID: 'EV2', Publicacao: 'publicado', SlugPublico: 'outro' })]),
    Fotos: fakeSheet([
      FOTOS.slice(),
      ['F1', 'EV1', 'O1', 'P1', 'T1', 'foto', 'NAO', ''],
      ['F2', 'EV1', 'O2', 'P2', 'T2', 'foto', 'NAO', ''],
      ['F3', 'EV1', 'O3', 'P3', 'T3', 'capa', 'NAO', ''],
    ]),
    Pedidos: fakeSheet([
      ['PedidoID', 'Status', 'DataCriacao'],
      ['PED1', 'Pagamento Confirmado', '2026-01-01T10:00:00Z'],
      ['PED2', 'rejected', new Date().toISOString()],
    ]),
    ItensPedido: fakeSheet([
      ['PedidoID', 'FotoID', 'EventoID', 'PrecoUnitario'],
      ['PED1', 'F1', 'EV1', 10],
      ['PED2', 'F3', 'EV1', 10],
    ]),
    AuditoriaPascom: fakeSheet([['Quando', 'Quem', 'Acao', 'EventoID', 'Detalhe']]),
  };
  SpreadsheetApp.openById.mockReturnValue({
    getSheetByName: (name) => sheets[name] || null,
    insertSheet: (name) => { sheets[name] = fakeSheet([]); return sheets[name]; },
  });
  PropertiesService.getScriptProperties.mockReturnValue({
    getProperty: (key) => (props[key] === undefined ? null : props[key]),
    setProperty: (key, value) => { props[key] = value; },
    deleteProperty: (key) => { delete props[key]; },
  });
  global.CacheService = {
    getScriptCache: () => ({
      get: (k) => cacheStore[k] || null,
      put: (k, v) => { cacheStore[k] = v; },
      remove: (k) => { delete cacheStore[k]; },
    }),
  };
  global.LockService = { getScriptLock: () => ({ waitLock: jest.fn(), releaseLock: jest.fn() }) };
  global.UrlFetchApp = { fetch: jest.fn() };
  global.Utilities.DigestAlgorithm = { SHA_256: 'sha256' };
  global.Utilities.computeDigest = jest.fn((_alg, text) => Array.from(crypto.createHash('sha256').update(text).digest()));
  DriveApp.getFileById.mockImplementation((id) => {
    const entry = files[id];
    if (!entry) throw new Error('not found');
    return {
      getSize: () => entry.size,
      isTrashed: () => entry.trashed,
      setTrashed: (value) => { entry.trashed = value; },
    };
  });
  DriveApp.getStorageUsed = jest.fn(() => 9 * 1024 ** 3);
  DriveApp.getStorageLimit = jest.fn(() => 15 * 1024 ** 3);
  MailApp.getRemainingDailyQuota = jest.fn(() => 95);
});

const sistema = require('../Sistema');
const { EVENTO_ACOES } = require('../EventAdmin');
const sheetModule = require('../Sheet');

describe('diagnosticoSistema', () => {
  function folder(name, extra = {}) {
    return {
      getName: () => name,
      isTrashed: () => false,
      getLastUpdated: () => new Date('2026-09-01T10:00:00Z'),
      getDateCreated: () => new Date('2026-09-10T10:00:00Z'),
      getFiles: () => folderIterator([{ getSize: () => 500 }, { getSize: () => 250 }]),
      ...extra,
    };
  }

  beforeEach(() => {
    DriveApp.getFolderById.mockImplementation((id) => {
      if (id === 'amostras') throw new Error('sem acesso');
      if (id === 'source') {
        return folder('Fotos_Origem', {
          getFolders: () => folderIterator([
            folder('_ERRO_crisma__2026-06-01__turma_202606011200', {
              getId: () => 'q1',
              getFoldersByName: () => folderIterator([{ getFiles: () => folderIterator([{}, {}]) }]),
            }),
            folder('_ENVIANDO__casamento__2026-09-10__ana'),
            folder('batismo__2026-09-12__joao'),
          ]),
        });
      }
      return folder(id);
    });
  });

  it('informa gatilho ausente, pastas inacessiveis e quarentena sem expor valores de segredos', () => {
    ScriptApp.getProjectTriggers.mockReturnValue([]);
    delete props.WATERMARK_API_SECRET;
    const diag = sistema.diagnosticoSistema();

    expect(diag.versao).toBe(require('../Upload').VERSAO_WEBAPP);
    expect(diag.gatilho).toBe(false);
    expect(diag.propriedades.WATERMARK_API_SECRET).toEqual({ presente: false, obrigatoria: true });
    expect(diag.propriedades.APPS_SCRIPT_HMAC_SECRET).toEqual({ presente: true, obrigatoria: true });
    expect(diag.pastas).toEqual({ origem: 'ok', originais: 'ok', previas: 'inacessivel', miniaturas: 'ausente' });
    expect(diag.quarentena).toEqual([{
      nome: '_ERRO_crisma__2026-06-01__turma_202606011200', folderId: 'q1', desde: '2026-09-01T10:00:00.000Z',
      eventoId: '', falhas: 2, nomeValido: true,
    }]);
    expect(diag.enviando).toEqual({ quantidade: 1, maisAntigo: '2026-09-10T10:00:00.000Z' });
    expect(diag.armazenamento).toEqual(expect.objectContaining({ usado: 9 * 1024 ** 3, limite: 15 * 1024 ** 3 }));
    expect(diag.email.cotaRestante).toBe(95);

    const texto = JSON.stringify(diag);
    expect(texto).not.toContain('segredo-muito-secreto');
    expect(texto).not.toContain('admin@paroquia.test');
  });

  it('reconhece o gatilho de 5 minutos, o lock e a ultima execucao', () => {
    ScriptApp.getProjectTriggers.mockReturnValue([
      { getHandlerFunction: () => 'processarEventos', getEventType: () => 'CLOCK' },
    ]);
    props.PROCESSING_LOCK = JSON.stringify({ eventoId: 'EV9', ts: Date.parse('2026-09-19T10:00:00Z') });
    sistema.registrarUltimaExecucao({ inicio: 'a', fim: 'b', resultado: 'ok', evento: 'EV9', erro: '' });
    const diag = sistema.diagnosticoSistema();
    expect(diag.gatilho).toBe(true);
    expect(diag.lock).toEqual({ eventoId: 'EV9', desde: '2026-09-19T10:00:00.000Z' });
    expect(diag.ultimaExecucao).toEqual(expect.objectContaining({ resultado: 'ok', evento: 'EV9' }));
  });

  it('entrega a ultima conferencia de pagamentos para a aba Sistema', () => {
    expect(sistema.diagnosticoSistema().conciliacao).toBeNull();
    props.ULTIMA_CONCILIACAO = JSON.stringify({
      quando: '2026-09-19T11:58:00Z', entregues: 1, reenviados: 0, resumo: { erros: 1, avisos: 0 },
    });
    expect(sistema.diagnosticoSistema().conciliacao).toEqual(expect.objectContaining({
      quando: '2026-09-19T11:58:00Z', entregues: 1, resumo: { erros: 1, avisos: 0 },
    }));
  });

  it('guarda o tamanho das pastas em cache para nao varrer o Drive a cada verificacao', () => {
    expect(sistema.tamanhoPastas(false).completo).toBe(false); // pasta inacessivel: nao guarda
    DriveApp.getFolderById.mockImplementation((id) => folder(id));
    const primeiro = sistema.tamanhoPastas(false);
    expect(primeiro.pastas.originais).toEqual({ bytes: 750, arquivos: 2 });
    DriveApp.getFolderById.mockClear();
    expect(sistema.tamanhoPastas(false)).toEqual(primeiro);
    expect(DriveApp.getFolderById).not.toHaveBeenCalled();
  });
});

describe('alerta de espaco', () => {
  it('envia no maximo um e-mail por dia quando o Drive passa de 85%', () => {
    DriveApp.getStorageUsed.mockReturnValue(14 * 1024 ** 3);
    expect(sistema.verificarAlertaEspaco()).toBe(true);
    expect(MailApp.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@paroquia.test' }));
    expect(sistema.verificarAlertaEspaco()).toBe(false);
    expect(MailApp.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('nao avisa abaixo do limite', () => {
    expect(sistema.verificarAlertaEspaco()).toBe(false);
    expect(MailApp.sendEmail).not.toHaveBeenCalled();
  });
});

describe('liberar espaco', () => {
  it('estima o que sai e o que fica sem mexer em nada', () => {
    const estimativa = sistema.estimarLiberacaoEvento({ eventoId: 'EV1' });
    // Sai: P1,T1 (vendida) + O2,P2,T2 + O3,P3,T3 (pedido rejeitado nao segura o original).
    expect(estimativa).toEqual(expect.objectContaining({
      arquivos: 8, bytesLiberados: 2000 + 600, originaisMantidos: 1, bytesMantidos: 1000, pedidosPendentes: 0, fotos: 3,
    }));
    expect(Object.values(files).every((f) => !f.trashed)).toBe(true);
  });

  it('manda para a lixeira previas, miniaturas e originais nao vendidos, mantendo o original vendido', () => {
    const resultado = EVENTO_ACOES.liberarEspaco({ eventoId: 'EV1', quem: 'pascom@paroquia.test' });
    expect(resultado).toEqual(expect.objectContaining({ situacao: 'concluida', arquivos: 8, bytesLiberados: 2600 }));
    expect(files.O1.trashed).toBe(false);
    ['P1', 'T1', 'O2', 'P2', 'T2', 'O3', 'P3', 'T3'].forEach((id) => expect(files[id].trashed).toBe(true));
    expect(field('Fotos', 1, 'ArquivosLiberados')).toBe('SIM');
    expect(field('Eventos', 1, 'EspacoLiberacao')).toBe('concluida');
    expect(field('Eventos', 1, 'EspacoLiberadoBytes')).toBe(2600);
    expect(sheets.AuditoriaPascom.values[1].slice(2, 4)).toEqual(['liberarEspaco', 'EV1']);

    // Repetir nao apaga nada novo nem soma bytes de novo.
    const repetido = sistema.liberarEspacoEvento('EV1');
    expect(repetido.arquivos).toBe(0);
    expect(field('Eventos', 1, 'EspacoLiberadoBytes')).toBe(2600);
  });

  it('fica parcial quando o tempo acaba e continua depois', () => {
    const agora = jest.spyOn(Date, 'now');
    let t = 0;
    agora.mockImplementation(() => { t += 1000; return t; });
    const parcial = sistema.liberarEspacoEvento('EV1', { tempoMaxMs: 1500 });
    expect(parcial.situacao).toBe('parcial');
    expect(field('Eventos', 1, 'EspacoLiberacao')).toBe('parcial');
    agora.mockRestore();

    const final = sistema.liberarEspacoEvento('EV1');
    expect(final.situacao).toBe('concluida');
    expect(field('Eventos', 1, 'EspacoLiberadoBytes')).toBe(2600);
    expect(files.O1.trashed).toBe(false);
  });

  it('recusa evento nao arquivado e evento com pedido aguardando pagamento', () => {
    expect(() => sistema.liberarEspacoEvento('EV2')).toThrow(expect.objectContaining({ codigo: 'regra_negocio' }));
    sheets.Pedidos.values.push(['PED3', 'Pagamento Pendente', new Date().toISOString()]);
    sheets.ItensPedido.values.push(['PED3', 'F2', 'EV1', 10]);
    expect(() => sistema.liberarEspacoEvento('EV1')).toThrow(/aguardando pagamento/);
    expect(Object.values(files).every((f) => !f.trashed)).toBe(true);
  });

  it('depois de liberar, o evento nao pode voltar a ser publicado nem vendido', () => {
    sistema.liberarEspacoEvento('EV1');
    expect(() => sheetModule.publicarEvento('EV1')).toThrow(/removidos para liberar espaco/);
    sheets.Eventos.values[1] = evento({ Publicacao: 'publicado', EspacoLiberacao: 'parcial' });
    expect(() => sheetModule.autorizarVendaEvento('EV1')).toThrow(/removidos para liberar espaco/);
  });
});

describe('Web App', () => {
  it('despacha diagnostico e estimativa como leituras assinadas', () => {
    global.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) };
    const { doPost } = require('../Upload');
    const call = (acao, payload) => {
      const body = JSON.stringify(payload);
      const timestamp = Date.now();
      const assinatura = crypto.createHmac('sha256', 'segredo-muito-secreto').update(`${timestamp}.${acao}.${body}`).digest('hex');
      return JSON.parse(doPost({ postData: { contents: JSON.stringify({ acao, timestamp, payload: body, assinatura }) } }).text);
    };
    DriveApp.getFolderById.mockImplementation(() => ({
      getName: () => 'x', isTrashed: () => false, getFolders: () => folderIterator([]), getFiles: () => folderIterator([]),
    }));
    expect(call('diagnostico', {})).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ versao: require('../Upload').VERSAO_WEBAPP }) }));
    expect(call('estimarLiberacao', { eventoId: 'EV1' }).data.arquivos).toBe(8);
    expect(call('estimarLiberacao', { eventoId: 'EV2' })).toEqual(expect.objectContaining({ ok: false, codigo: 'regra_negocio' }));
  });
});
