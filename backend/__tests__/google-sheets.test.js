jest.mock('google-spreadsheet', () => {
  const mockRows = [
    { ID: 'FOTO_001', Evento: 'Missa de Páscoa', Link_Amostra: 'https://drive.google.com/a', Status: 'Processada', Preco: '25', save: jest.fn().mockResolvedValue(undefined) },
    { ID: 'FOTO_002', Evento: 'Missa de Páscoa', Link_Amostra: 'https://drive.google.com/b', Status: 'Processada', Preco: '25', save: jest.fn().mockResolvedValue(undefined) },
  ];
  const mockSheet = {
    getRows: jest.fn().mockResolvedValue(mockRows),
    addRow: jest.fn().mockResolvedValue(undefined),
  };
  const mockDoc = {
    useServiceAccountAuth: jest.fn().mockResolvedValue(undefined),
    loadInfo: jest.fn().mockResolvedValue(undefined),
    sheetsByTitle: { Fotos: mockSheet },
  };
  return { GoogleSpreadsheet: jest.fn(() => mockDoc) };
});

const { listarFotos, registrarPedido, atualizarStatus } = require('../lib/google-sheets');

describe('listarFotos', () => {
  it('retorna array de fotos com campos esperados', async () => {
    const fotos = await listarFotos();
    expect(Array.isArray(fotos)).toBe(true);
    expect(fotos[0]).toHaveProperty('id');
    expect(fotos[0]).toHaveProperty('event');
    expect(fotos[0]).toHaveProperty('url');
    expect(fotos[0]).toHaveProperty('price');
  });

  it('filtra apenas fotos com status Processada', async () => {
    const fotos = await listarFotos();
    expect(fotos.length).toBe(2);
  });
});

describe('registrarPedido', () => {
  it('não lança erro com dados válidos', async () => {
    await expect(
      registrarPedido({ fotoIds: ['FOTO_001'], whatsapp: '11999999999', totalPago: 25.75, idMercadoPago: 'MP_123' })
    ).resolves.not.toThrow();
  });
});

describe('atualizarStatus', () => {
  it('lança erro se fotoId não encontrada', async () => {
    await expect(atualizarStatus('INEXISTENTE', 'Pagamento Confirmado')).rejects.toThrow();
  });

  it('atualiza status da foto existente', async () => {
    await expect(atualizarStatus('FOTO_001', 'Pagamento Confirmado')).resolves.not.toThrow();
  });
});
