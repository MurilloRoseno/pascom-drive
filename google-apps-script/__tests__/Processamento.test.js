const crypto = require('crypto');

// ─── Fakes de planilha e Drive em memoria ────────────────────────────────────

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
    appendRow(row) { this.values.push(row.slice()); },
    setFrozenRows() {},
  };
}

let sheets;
let props;
let drive;
let clock;

function iterator(items) {
  let i = 0;
  return { hasNext: () => i < items.length, next: () => items[i++] };
}

function novaPasta(id, name, parentId) {
  const pasta = {
    id, name, parentId, trashed: false,
    getId: () => pasta.id,
    getName: () => pasta.name,
    setName: (value) => { pasta.name = value; },
    isTrashed: () => pasta.trashed,
    setTrashed: (value) => { pasta.trashed = value; },
    getLastUpdated: () => new Date('2026-09-01T10:00:00Z'),
    getParents: () => iterator(pasta.parentId ? [drive.folders[pasta.parentId]] : []),
    getFiles: () => iterator(Object.values(drive.files).filter((f) => f.parentId === pasta.id && !f.trashed)),
    getFolders: () => iterator(Object.values(drive.folders).filter((f) => f.parentId === pasta.id && !f.trashed)),
    getFoldersByName: (nome) => iterator(Object.values(drive.folders)
      .filter((f) => f.parentId === pasta.id && f.name === nome && !f.trashed)),
    createFolder: (nome) => novaPasta(`${pasta.id}/${nome}`, nome, pasta.id),
  };
  drive.folders[id] = pasta;
  return pasta;
}

function novoArquivo(id, name, parentId) {
  const arquivo = {
    id, name, parentId, trashed: false, description: '',
    getId: () => arquivo.id,
    getName: () => arquivo.name,
    getMimeType: () => 'image/jpeg',
    getDescription: () => arquivo.description,
    setDescription: (value) => { arquivo.description = value; },
    isTrashed: () => arquivo.trashed,
    setTrashed: (value) => { arquivo.trashed = value; },
    moveTo: (pasta) => { arquivo.parentId = pasta.getId(); },
  };
  drive.files[id] = arquivo;
  return arquivo;
}

function linhas(nome) {
  const [headers, ...rows] = sheets[nome].values;
  return rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

function evento(eventoId) {
  return linhas('Eventos').find((e) => e.EventoID === eventoId);
}

beforeEach(() => {
  jest.clearAllMocks();
  sheets = {};
  drive = { folders: {}, files: {} };
  clock = Date.parse('2026-09-19T12:00:00Z');
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  props = { SPREADSHEET_ID: 'sheet', SOURCE_FOLDER_ID: 'source', APPS_SCRIPT_HMAC_SECRET: 'segredo' };
  SpreadsheetApp.openById.mockReturnValue({
    getSheetByName: (name) => sheets[name] || null,
    insertSheet: (name) => { sheets[name] = fakeSheet([]); return sheets[name]; },
  });
  PropertiesService.getScriptProperties.mockReturnValue({
    getProperty: (key) => (props[key] === undefined ? null : props[key]),
    setProperty: (key, value) => { props[key] = value; },
    deleteProperty: (key) => { delete props[key]; },
  });
  DriveApp.getFolderById.mockImplementation((id) => {
    if (!drive.folders[id]) throw new Error('pasta nao existe');
    return drive.folders[id];
  });
  // Carimbo da quarentena tem 12 digitos (yyyyMMddHHmm); o ID do evento usa so a data.
  global.Utilities.formatDate = jest.fn((_d, _tz, formato) => (formato === 'yyyyMMdd' ? '20260919' : '202609191200'));
  global.Utilities.DigestAlgorithm = { SHA_256: 'sha256' };
  global.Utilities.computeDigest = jest.fn((_alg, text) => Array.from(crypto.createHash('sha256').update(text).digest()));
  global.LockService = { getScriptLock: () => ({ waitLock: jest.fn(), releaseLock: jest.fn() }) };
  novaPasta('source', 'Fotos_Origem', null);
  // EventQueue.gerarEventoId usa getStatusEvento global (injetado pelo Apps Script).
  global.getStatusEvento = require('../Sheet').getStatusEvento;

  // Processamento da foto simulado: grava a linha (com a origem) e manda a origem para a lixeira.
  // Cada foto "leva" 1 segundo, para exercitar o orcamento de tempo das fatias.
  global.processarFoto = jest.fn((arquivo, eventoId, n) => {
    clock += 1000;
    if (/ruim/.test(arquivo.getName())) throw new Error('JPEG corrompido');
    require('../Sheet').registrarFoto({
      id: `FOTO_${arquivo.getId()}`, eventoId, originalFileId: `O_${arquivo.getId()}`,
      previewFileId: `P_${n}`, thumbnailFileId: `T_${n}`, tipoFoto: /^capa/.test(arquivo.getName()) ? 'capa' : 'foto',
      arquivoOrigemId: arquivo.getId(),
    });
    arquivo.setTrashed(true);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.processarFoto;
  delete global.solicitarDerivado;
  delete global.salvarDerivado;
  delete global.trashFileById;
  delete global.liberarEspacoEvento;
});

const processamento = require('../Processamento');
const { EVENTO_ACOES } = require('../EventAdmin');

function criarEventoNaEntrada(nome, quantidade, extras = []) {
  const pasta = novaPasta('pasta1', nome, 'source');
  for (let i = 1; i <= quantidade; i++) novoArquivo(`A${String(i).padStart(2, '0')}`, `foto-${String(i).padStart(2, '0')}.jpg`, 'pasta1');
  extras.forEach((nomeArquivo, i) => novoArquivo(`X${i}`, nomeArquivo, 'pasta1'));
  return { folderId: pasta.getId(), nomePasta: nome };
}

function cicloDoGatilho(entrada, orcamentoMs) {
  const alvo = { folderId: entrada.folderId, nomePasta: drive.folders[entrada.folderId].getName() };
  const resolvido = processamento.resolverEventoDaPasta(alvo);
  return processamento.processarFatia(alvo, resolvido.eventoId, resolvido.existente, { orcamentoMs });
}

describe('processamento em fatias', () => {
  it('termina um evento grande em varias fatias, com um unico EventoID e sem duplicar fotos', () => {
    const entrada = criarEventoNaEntrada('crisma__2026-06-01__turma-da-tarde', 12);

    const primeira = cicloDoGatilho(entrada, 4500);
    expect(primeira).toEqual(expect.objectContaining({ resultado: 'parcial', restantes: 7 }));
    const eventoId = primeira.evento;
    expect(evento(eventoId)).toEqual(expect.objectContaining({ StatusProcessamento: 'Processando', FotosProcessadas: 5, TotalFotos: 12 }));

    expect(cicloDoGatilho(entrada, 4500)).toEqual(expect.objectContaining({ resultado: 'parcial', evento: eventoId, restantes: 2 }));
    expect(cicloDoGatilho(entrada, 4500)).toEqual({ resultado: 'ok', evento: eventoId });

    expect(linhas('Eventos')).toHaveLength(1);
    expect(linhas('Fotos')).toHaveLength(12);
    expect(evento(eventoId)).toEqual(expect.objectContaining({ StatusProcessamento: 'Processado', FotosProcessadas: 12, PastaRemovida: true }));
    expect(drive.folders.pasta1.trashed).toBe(true);
  });

  it('na retomada nao duplica a foto ja gravada antes de a execucao morrer', () => {
    const entrada = criarEventoNaEntrada('batismo__2026-06-01__ana', 3);
    const primeira = cicloDoGatilho(entrada, 1500);
    expect(primeira.resultado).toBe('parcial');
    // Simula a morte entre gravar a linha e mandar a origem para a lixeira.
    const proxima = drive.files.A03;
    require('../Sheet').registrarFoto({
      id: 'FOTO_A03', eventoId: primeira.evento, originalFileId: 'O_A03', previewFileId: 'P', thumbnailFileId: 'T', arquivoOrigemId: 'A03',
    });

    expect(cicloDoGatilho(entrada, 60000)).toEqual({ resultado: 'ok', evento: primeira.evento });
    expect(proxima.trashed).toBe(true);
    expect(linhas('Fotos').filter((f) => f.ArquivoOrigemID === 'A03')).toHaveLength(1);
    expect(global.processarFoto).not.toHaveBeenCalledWith(proxima, expect.anything(), expect.anything());
  });

  it('foto que falha 3 vezes vai para _FALHAS sem prender as outras, e o evento fica em quarentena', () => {
    const entrada = criarEventoNaEntrada('casamento__2026-05-20__joao', 2, ['ruim.jpg']);
    const r1 = cicloDoGatilho(entrada, 60000);
    expect(r1).toEqual(expect.objectContaining({ resultado: 'parcial', restantes: 1 }));
    expect(drive.files.X0.description).toBe('pascom:tentativas=1');
    expect(evento(r1.evento).FotosProcessadas).toBe(2);

    cicloDoGatilho(entrada, 60000);
    const r3 = cicloDoGatilho(entrada, 60000);
    expect(r3).toEqual(expect.objectContaining({ resultado: 'erro', evento: r1.evento }));
    expect(drive.folders[drive.files.X0.parentId].name).toBe('_FALHAS');
    expect(drive.folders.pasta1.name).toMatch(/^_ERRO_casamento__2026-05-20__joao_/);
    expect(JSON.parse(evento(r1.evento).Erros)).toEqual(['Foto (ruim.jpg): JPEG corrompido']);
    expect(evento(r1.evento).StatusProcessamento).toBe('Erro');
    expect(linhas('Eventos')).toHaveLength(1);
  });
});

describe('quarentena pelo painel', () => {
  function eventoEmQuarentena() {
    const entrada = criarEventoNaEntrada('casamento__2026-05-20__joao', 2, ['ruim.jpg']);
    let r;
    for (let i = 0; i < 3; i++) r = cicloDoGatilho(entrada, 60000);
    return { entrada, eventoId: r.evento };
  }

  it('tentar de novo devolve as falhas e retoma com o mesmo EventoID', () => {
    const { entrada, eventoId } = eventoEmQuarentena();
    const resultado = EVENTO_ACOES.reprocessar({ eventoId, quem: 'pascom@paroquia.test' });
    expect(resultado).toEqual(expect.objectContaining({ devolvidas: 1, nomePasta: 'casamento__2026-05-20__joao', eventoId }));
    expect(drive.files.X0.parentId).toBe('pasta1');
    expect(drive.files.X0.description).toBe('');
    expect(evento(eventoId)).toEqual(expect.objectContaining({ StatusProcessamento: 'Pendente', Erros: '' }));

    drive.files.X0.name = 'agora-boa.jpg';
    expect(cicloDoGatilho(entrada, 60000)).toEqual({ resultado: 'ok', evento: eventoId });
    expect(linhas('Eventos')).toHaveLength(1);
    expect(linhas('Fotos')).toHaveLength(3);
    expect(sheets.AuditoriaPascom.values.at(-1).slice(2, 4)).toEqual(['reprocessar', eventoId]);
  });

  it('descartar as fotos com falha conclui o evento com o que deu certo', () => {
    const { eventoId } = eventoEmQuarentena();
    expect(EVENTO_ACOES.descartarFalhas({ eventoId })).toEqual({ descartadas: 1, situacao: 'concluido' });
    expect(drive.folders['pasta1/_FALHAS'].trashed).toBe(true);
    expect(drive.folders.pasta1.trashed).toBe(true);
    expect(evento(eventoId)).toEqual(expect.objectContaining({ StatusProcessamento: 'Processado', Erros: '', TotalFotos: 2 }));
  });

  it('so reprocessa evento com erro', () => {
    const entrada = criarEventoNaEntrada('batismo__2026-06-01__ana', 1);
    const { evento: eventoId } = cicloDoGatilho(entrada, 60000);
    expect(() => EVENTO_ACOES.reprocessar({ eventoId })).toThrow(expect.objectContaining({ codigo: 'regra_negocio' }));
  });

  it('corrige o nome de uma pasta em quarentena e a devolve para a fila', () => {
    novaPasta('pastaErrada1', '_ERRO_fotos do sabado_202609011200', 'source');
    const { PASTA_ACOES } = processamento;
    expect(() => PASTA_ACOES.corrigirNomePasta({ folderId: 'pastaErrada1', categoria: 'festa', data: '2026-06-01', titulo: 'Turma' }))
      .toThrow(expect.objectContaining({ codigo: 'dados_invalidos' }));
    const resultado = PASTA_ACOES.corrigirNomePasta({
      folderId: 'pastaErrada1', categoria: 'crisma', data: '2026-06-01', titulo: 'Turma da Tarde', quem: 'x',
    });
    expect(resultado.nomePasta).toBe('crisma__2026-06-01__turma-da-tarde');
    expect(drive.folders.pastaErrada1.name).toBe('crisma__2026-06-01__turma-da-tarde');
    expect(() => PASTA_ACOES.reprocessarPasta({ folderId: 'pastaErrada1' })).toThrow(/nao esta em quarentena/);
    expect(() => PASTA_ACOES.reprocessarPasta({ folderId: '../x' })).toThrow(expect.objectContaining({ codigo: 'dados_invalidos' }));
  });
});

describe('troca de capa', () => {
  const FOTOS = ['FotoID', 'EventoID', 'OriginalFileID', 'PreviewFileID', 'ThumbnailFileID', 'TipoFoto', 'StatusProcessamento', 'DisponivelVenda', 'ArquivosLiberados', 'ArquivoOrigemID'];

  beforeEach(() => {
    const Sheet = require('../Sheet');
    const eventos = Sheet.getEventosSheet();
    Sheet.registrarEvento({ eventoId: 'EV1', nomePasta: 'casamento__2026-05-20__joao', folderId: 'x', totalFotos: 2 });
    Sheet.atualizarStatusEvento('EV1', 'Processado', {});
    const headers = eventos.values[0];
    eventos.values[1][headers.indexOf('VendaAutorizada')] = 'SIM';
    sheets.Fotos = fakeSheet([
      FOTOS.slice(),
      ['F1', 'EV1', 'O1', 'P1', 'T1', 'foto', 'Processada', 'SIM', '', ''],
      ['C1', 'EV1', 'OC', 'PC', 'TC', 'capa', 'Processada', 'NAO', '', ''],
    ]);
    props.AMOSTRAS_FOLDER_ID = 'amostras';
    novaPasta('amostras', 'Amostras', null);
    global.solicitarDerivado = jest.fn((fileId, semMarca, variant) => ({ blob: `${fileId}-${semMarca ? 'limpa' : 'marca'}-${variant}` }));
    global.salvarDerivado = jest.fn((blob, nome) => ({ getId: () => `novo:${blob.blob}:${nome}` }));
    global.trashFileById = jest.fn();
  });

  it('enfileira pelo painel e o gatilho troca os tipos, gera derivados e manda os antigos para a lixeira', () => {
    expect(EVENTO_ACOES.trocarCapa({ eventoId: 'EV1', fotoId: 'F1', quem: 'pascom@paroquia.test' }))
      .toEqual(expect.objectContaining({ situacao: 'na_fila' }));
    expect(() => EVENTO_ACOES.trocarCapa({ eventoId: 'EV1', fotoId: 'F1' })).toThrow(/Ja existe uma troca de capa/);
    expect(global.solicitarDerivado).not.toHaveBeenCalled();

    expect(processamento.executarPedidosPendentes(Date.now())).toBe(1);
    expect(linhas('PedidosProcessamento')[0].Detalhe).toBe('capa: F1');

    const [f1, c1] = linhas('Fotos');
    expect(f1).toEqual(expect.objectContaining({ TipoFoto: 'capa', DisponivelVenda: 'NAO' }));
    expect(f1.PreviewFileID).toMatch(/^novo:O1-limpa-preview:\[CAPA\]EV1_F1/);
    expect(c1).toEqual(expect.objectContaining({ TipoFoto: 'foto', DisponivelVenda: 'SIM' }));
    expect(c1.PreviewFileID).toMatch(/^novo:OC-marca-preview:\[AMOSTRA\]EV1_C1/);
    expect(global.trashFileById.mock.calls.map((c) => c[0]).sort()).toEqual(['P1', 'PC', 'T1', 'TC']);
    expect(linhas('PedidosProcessamento')[0]).toEqual(expect.objectContaining({ Status: 'concluido', Tipo: 'trocarCapa', Alvo: 'F1' }));
    expect(processamento.pedidoPendenteDoEvento('EV1')).toBeNull();
  });

  it('recusa capa que ja e capa, foto de outro evento e evento em processamento', () => {
    expect(() => EVENTO_ACOES.trocarCapa({ eventoId: 'EV1', fotoId: 'C1' })).toThrow(/ja e a capa/);
    expect(() => EVENTO_ACOES.trocarCapa({ eventoId: 'EV1', fotoId: 'OUTRA' })).toThrow(/nao encontrada/);
    expect(() => EVENTO_ACOES.trocarCapa({ eventoId: 'EV1', fotoId: '../x' })).toThrow(expect.objectContaining({ codigo: 'dados_invalidos' }));
    require('../Sheet').atualizarStatusEvento('EV1', 'Processando', {});
    expect(() => EVENTO_ACOES.trocarCapa({ eventoId: 'EV1', fotoId: 'F1' })).toThrow(/Aguarde o processamento/);
  });

  it('falha no backend marca o pedido com erro e nao mexe na planilha', () => {
    EVENTO_ACOES.trocarCapa({ eventoId: 'EV1', fotoId: 'F1' });
    global.solicitarDerivado = jest.fn(() => { throw new Error('Preview API falhou (500)'); });
    processamento.executarPedidosPendentes(Date.now());
    expect(linhas('PedidosProcessamento')[0]).toEqual(expect.objectContaining({ Status: 'erro', Detalhe: 'Preview API falhou (500)' }));
    expect(linhas('Fotos')[0].TipoFoto).toBe('foto');
    expect(global.trashFileById).not.toHaveBeenCalled();
  });
});

it('liberar espaco pelo painel usa um orcamento curto, abaixo do limite do backend', () => {
  global.liberarEspacoEvento = jest.fn(() => ({ situacao: 'parcial', arquivos: 1, bytesLiberados: 10 }));
  require('../Sheet').registrarEvento({ eventoId: 'EV1', nomePasta: 'x', folderId: 'x', totalFotos: 1 });
  EVENTO_ACOES.liberarEspaco({ eventoId: 'EV1' });
  expect(global.liberarEspacoEvento).toHaveBeenCalledWith('EV1', { tempoMaxMs: 18000 });
});
