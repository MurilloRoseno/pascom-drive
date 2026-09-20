global.processarEntregas = jest.fn();
const { criarTriggers, entregarFotos, processarEventos } = require('../Code');

beforeEach(() => jest.clearAllMocks());

it('instala somente o trigger de processamento oculto de eventos', () => {
  const existing = {};
  ScriptApp.getProjectTriggers.mockReturnValue([existing]);
  criarTriggers();
  expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(existing);
  expect(ScriptApp.newTrigger).toHaveBeenCalledWith('processarEventos');
  expect(ScriptApp.newTrigger).not.toHaveBeenCalledWith('entregarFotos');
});

it('mantem o entregador legado inativo para nao liberar link permanente', () => {
  entregarFotos();
  expect(global.processarEntregas).not.toHaveBeenCalled();
});

it('processa uma fatia do evento com o EventoID resolvido pela pasta e sempre libera o lock', () => {
  global.sincronizarConfiguracoesAdministrativas = jest.fn();
  global.getEventosSheet = jest.fn().mockReturnValue({
    getDataRange: jest.fn().mockReturnValue({
      getValues: jest.fn().mockReturnValue([['EventoID', 'FolderID', 'StatusProcessamento', 'PastaRemovida']]),
    }),
  });
  const evento = { folderId: 'f1', nomePasta: 'ordem__2026-06-01__missa' };
  global.listarEventosNovos = jest.fn().mockReturnValue([evento]);
  global.resolverEventoDaPasta = jest.fn().mockReturnValue({ eventoId: 'EV_1', existente: { eventoId: 'EV_1', status: 'Processando' } });
  global.acquireLock = jest.fn().mockReturnValue(true);
  global.processarFatia = jest.fn().mockReturnValue({ resultado: 'parcial', evento: 'EV_1', restantes: 40 });
  global.releaseLock = jest.fn();

  processarEventos();

  expect(global.acquireLock).toHaveBeenCalledWith('EV_1');
  expect(global.processarFatia).toHaveBeenCalledWith(evento, 'EV_1', { eventoId: 'EV_1', status: 'Processando' });
  expect(global.releaseLock).toHaveBeenCalled();
});

it('falha critica fora das fotos manda a pasta para a quarentena sem perder o lock', () => {
  global.listarEventosNovos = jest.fn().mockReturnValue([{ folderId: 'f1', nomePasta: 'x' }]);
  global.resolverEventoDaPasta = jest.fn().mockReturnValue({ eventoId: 'EV_1', existente: null });
  global.acquireLock = jest.fn().mockReturnValue(true);
  global.processarFatia = jest.fn(() => { throw new Error('planilha cheia'); });
  global.atualizarStatusEvento = jest.fn();
  global.moverParaQuarentena = jest.fn();
  global.releaseLock = jest.fn();
  processarEventos();
  expect(global.atualizarStatusEvento).toHaveBeenCalledWith('EV_1', 'Erro', { erro: 'planilha cheia' });
  expect(global.moverParaQuarentena).toHaveBeenCalledWith('f1', 'planilha cheia');
  expect(global.releaseLock).toHaveBeenCalled();
});

describe('registro da ultima execucao', () => {
  let registros;
  beforeEach(() => {
    registros = [];
    global.registrarUltimaExecucao = jest.fn((dados) => registros.push(dados));
    global.verificarAlertaEspaco = jest.fn();
    global.sincronizarConfiguracoesAdministrativas = jest.fn();
    global.getEventosSheet = jest.fn().mockReturnValue({
      getDataRange: jest.fn().mockReturnValue({ getValues: jest.fn().mockReturnValue([['EventoID']]) }),
    });
  });
  afterEach(() => {
    delete global.registrarUltimaExecucao;
    delete global.verificarAlertaEspaco;
  });

  it('grava quando nao ha eventos e verifica o espaco do Drive', () => {
    global.listarEventosNovos = jest.fn().mockReturnValue([]);
    processarEventos();
    expect(registros[0]).toEqual(expect.objectContaining({ resultado: 'sem_eventos', erro: '' }));
    expect(registros[0].inicio).toMatch(/^\d{4}-/);
    expect(global.verificarAlertaEspaco).toHaveBeenCalled();
  });

  it('confere as entregas no fim do ciclo, e uma falha ali nao derruba o processamento', () => {
    global.listarEventosNovos = jest.fn().mockReturnValue([]);
    global.conciliarEntregasBackend = jest.fn().mockReturnValue({ resultado: 'ok' });

    processarEventos();

    expect(global.conciliarEntregasBackend).toHaveBeenCalledWith(expect.any(Number));
    expect(registros[0]).toEqual(expect.objectContaining({ resultado: 'sem_eventos' }));

    global.conciliarEntregasBackend = jest.fn(() => { throw new Error('backend fora do ar'); });
    expect(() => processarEventos()).not.toThrow();
    expect(registros[1]).toEqual(expect.objectContaining({ resultado: 'sem_eventos' }));
    delete global.conciliarEntregasBackend;
  });

  it('grava parcial com as fotos que faltam e executa os pedidos do painel', () => {
    global.listarEventosNovos = jest.fn().mockReturnValue([{ folderId: 'f1', nomePasta: 'batismo__2026-06-01__ana' }]);
    global.resolverEventoDaPasta = jest.fn().mockReturnValue({ eventoId: 'EV_OK', existente: null });
    global.acquireLock = jest.fn().mockReturnValue(true);
    global.processarFatia = jest.fn().mockReturnValue({ resultado: 'parcial', evento: 'EV_OK', restantes: 12 });
    global.releaseLock = jest.fn();
    global.executarPedidosPendentes = jest.fn();
    processarEventos();
    expect(registros[0]).toEqual(expect.objectContaining({ resultado: 'parcial', evento: 'EV_OK', restantes: 12 }));
    expect(global.executarPedidosPendentes).toHaveBeenCalledWith(expect.any(Number));
    expect(global.acquireLock).toHaveBeenLastCalledWith('PEDIDOS_PAINEL');
    delete global.executarPedidosPendentes;
  });

  it('grava erro mesmo quando a execucao falha antes de processar', () => {
    global.sincronizarConfiguracoesAdministrativas = jest.fn(() => { throw new Error('planilha fora do ar'); });
    expect(() => processarEventos()).toThrow('planilha fora do ar');
    expect(registros[0]).toEqual(expect.objectContaining({ resultado: 'erro', erro: 'planilha fora do ar' }));
  });
});
