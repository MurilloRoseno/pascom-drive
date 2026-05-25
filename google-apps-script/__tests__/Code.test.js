global.processarEntregas = jest.fn();
const { criarTriggers, entregarFotos } = require('../Code');

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
