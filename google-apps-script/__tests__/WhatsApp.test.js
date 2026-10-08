// Mock Sheet.js cross-file globals
global.listarPagamentosConfirmados = jest.fn().mockReturnValue([]);
global.atualizarCelula = jest.fn();
global.incrementarTentativas = jest.fn();
global.COL = { STATUS: 5, LINK_ENTREGA: 11, TENTATIVAS_ENTREGA: 12 };

global.montarEmailAdmin = require('../EmailTemplates').montarEmailAdmin;

const { gerarLinkWaMe, tentarEntrega, processarEntregas } = require('../WhatsApp');

beforeEach(() => {
  jest.clearAllMocks();
  global.atualizarCelula.mockReset();
  global.listarPagamentosConfirmados.mockReturnValue([]);
});

const rowValido = {
  id: 'FOTO_001',
  whatsapp: '11999999999',
  linkOriginal: 'https://drive.google.com/file/d/abc/view',
  tentativas: 0,
  rowIndex: 2,
};

describe('gerarLinkWaMe', () => {
  it('builds a wa.me URL with 55 prefix', () => {
    const link = gerarLinkWaMe('11999999999', 'https://drive.google.com/x');
    expect(link).toContain('https://wa.me/5511999999999');
  });

  it('includes encoded photo link in text param', () => {
    const photoLink = 'https://drive.google.com/file/d/xyz/view';
    expect(gerarLinkWaMe('11999999999', photoLink)).toContain(encodeURIComponent(photoLink));
  });

  it('does not double the 55 when number already has country code', () => {
    const link = gerarLinkWaMe('5511999999999', 'https://x.com');
    expect(link).toContain('wa.me/5511999999999');
    expect(link).not.toContain('555511');
  });
});

describe('tentarEntrega', () => {
  it('saves wa.me link to col 11 and sets Status to Entregue on success', () => {
    tentarEntrega(rowValido);
    expect(global.atualizarCelula).toHaveBeenCalledWith(2, 11, expect.stringContaining('wa.me'));
    expect(global.atualizarCelula).toHaveBeenCalledWith(2, 5, 'Entregue');
  });

  it('increments tentativas when update throws', () => {
    global.atualizarCelula.mockImplementationOnce(() => { throw new Error('net'); });
    tentarEntrega(rowValido);
    expect(global.incrementarTentativas).toHaveBeenCalledWith(2);
  });

  it('emails admin when tentativas reaches 3', () => {
    global.atualizarCelula.mockImplementation(() => { throw new Error('fail'); });
    tentarEntrega({ ...rowValido, tentativas: 2 });
    expect(MailApp.sendEmail).toHaveBeenCalledWith(
      'admin@paroquia.com',
      expect.stringContaining('FOTO_001'),
      expect.stringContaining('Erro: fail'),
      { htmlBody: expect.stringContaining('Falha definitiva de entrega: FOTO_001') }
    );
  });

  it('does not throw if final-failure email is not authorized', () => {
    global.atualizarCelula.mockImplementation(() => { throw new Error('fail'); });
    global.MailApp.sendEmail.mockImplementationOnce(() => {
      throw new Error('Specified permissions are not sufficient to call MailApp.sendEmail.');
    });

    expect(() => tentarEntrega({ ...rowValido, tentativas: 2 })).not.toThrow();
    expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Aviso por e-mail nao enviado'));
  });

  it('does NOT email admin when tentativas < 2', () => {
    global.atualizarCelula.mockImplementation(() => { throw new Error('fail'); });
    tentarEntrega({ ...rowValido, tentativas: 0 });
    expect(MailApp.sendEmail).not.toHaveBeenCalled();
  });

  it('skips silently when tentativas already >= 3', () => {
    tentarEntrega({ ...rowValido, tentativas: 3 });
    expect(global.atualizarCelula).not.toHaveBeenCalled();
  });
});

describe('processarEntregas', () => {
  it('calls tentarEntrega for each confirmed row', () => {
    global.listarPagamentosConfirmados.mockReturnValue([
      { ...rowValido, id: 'FOTO_001', rowIndex: 2 },
      { ...rowValido, id: 'FOTO_002', rowIndex: 3 },
    ]);
    processarEntregas();
    // 2 calls per row: Link_Entrega + Status
    expect(global.atualizarCelula).toHaveBeenCalledTimes(4);
  });

  it('does nothing when no confirmed payments', () => {
    processarEntregas();
    expect(global.atualizarCelula).not.toHaveBeenCalled();
  });
});
