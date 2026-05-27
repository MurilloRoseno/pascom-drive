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

it('preserva pasta de evento futuro enquanto ainda nao houver fotos', () => {
  global.sincronizarConfiguracoesAdministrativas = jest.fn();
  global.getEventosSheet = jest.fn().mockReturnValue({
    getDataRange: jest.fn().mockReturnValue({
      getValues: jest.fn().mockReturnValue([['EventoID', 'FolderID', 'StatusProcessamento', 'PastaRemovida']]),
    }),
  });
  global.listarEventosNovos = jest.fn().mockReturnValue([
    { folderId: 'future-folder', nomePasta: 'ordem__2026-06-01__missa-futura' },
  ]);
  global.interpretarNomePasta = jest.fn().mockReturnValue({
    nomeNormalizado: 'ordem__2026-06-01__missa-futura',
  });
  global.gerarEventoId = jest.fn().mockReturnValue('EVENTO_FUTURO');
  global.acquireLock = jest.fn().mockReturnValue(true);
  global.listarArquivosDoEvento = jest.fn().mockReturnValue([]);
  global.registrarEvento = jest.fn();
  global.atualizarStatusEvento = jest.fn();
  global.releaseLock = jest.fn();

  processarEventos();

  expect(global.registrarEvento).not.toHaveBeenCalled();
  expect(global.atualizarStatusEvento).not.toHaveBeenCalled();
  expect(DriveApp.getFolderById).not.toHaveBeenCalledWith('future-folder');
  expect(global.releaseLock).toHaveBeenCalled();
});
