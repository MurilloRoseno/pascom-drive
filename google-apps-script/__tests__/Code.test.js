// Mock globals called by Code.js
global.listNewFiles = jest.fn().mockReturnValue([]);
global.processarFoto = jest.fn();
global.processarEntregas = jest.fn();

const { criarTriggers, processarFotosNovas, entregarFotos } = require('../Code');

beforeEach(() => {
  jest.clearAllMocks();
  global.listNewFiles.mockReturnValue([]);
  global.processarFoto.mockReset();
});

describe('criarTriggers', () => {
  it('deletes existing triggers then creates two new ones', () => {
    const mockTrigger = {};
    ScriptApp.getProjectTriggers.mockReturnValue([mockTrigger]);
    criarTriggers();
    expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(mockTrigger);
    expect(ScriptApp.newTrigger).toHaveBeenCalledWith('processarFotosNovas');
    expect(ScriptApp.newTrigger).toHaveBeenCalledWith('entregarFotos');
  });
});

describe('processarFotosNovas', () => {
  it('calls listNewFiles and processarFoto for each file', () => {
    const { mockFile } = global.__mocks__;
    global.listNewFiles.mockReturnValue([mockFile, mockFile]);
    processarFotosNovas();
    expect(global.processarFoto).toHaveBeenCalledTimes(2);
  });

  it('does nothing when no new files', () => {
    processarFotosNovas();
    expect(global.processarFoto).not.toHaveBeenCalled();
  });
});

describe('entregarFotos', () => {
  it('calls processarEntregas', () => {
    entregarFotos();
    expect(global.processarEntregas).toHaveBeenCalledTimes(1);
  });
});
