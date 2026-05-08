jest.mock('google-spreadsheet', () => {
  return { GoogleSpreadsheet: jest.fn() };
});

jest.mock('google-auth-library', () => {
  return { JWT: jest.fn() };
});

function makeRow(data) {
  return {
    get: (k) => data[k],
    set: jest.fn((k, v) => { data[k] = v; }),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

const mockRows = [
  makeRow({ ID: 'FOTO_001', Evento: 'Missa de Páscoa', Link_Amostra: 'https://drive.google.com/a', Status: 'Processada', Preco: '25' }),
  makeRow({ ID: 'FOTO_002', Evento: 'Missa de Páscoa', Link_Amostra: 'https://drive.google.com/b', Status: 'Processada', Preco: '25' }),
];

const mockSheet = {
  getRows: jest.fn().mockResolvedValue(mockRows),
  addRow: jest.fn().mockResolvedValue(undefined),
};

const mockDoc = {
  loadInfo: jest.fn().mockResolvedValue(undefined),
  sheetsByTitle: { Fotos: mockSheet },
};

const { GoogleSpreadsheet } = require('google-spreadsheet');
GoogleSpreadsheet.mockImplementation(() => mockDoc);

const { listarFotos, registrarPedido, atualizarStatus, driveUrlToThumbnail } = require('../lib/google-sheets');

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

describe('driveUrlToThumbnail', () => {
  it('converte URL de compartilhamento para URL de thumbnail', () => {
    const input = 'https://drive.google.com/file/d/abc123XYZ/view?usp=sharing';
    expect(driveUrlToThumbnail(input)).toBe('https://drive.google.com/thumbnail?id=abc123XYZ&sz=w800');
  });

  it('retorna original se URL não tiver padrão /d/{id}', () => {
    expect(driveUrlToThumbnail('https://exemplo.com/foto.jpg')).toBe('https://exemplo.com/foto.jpg');
  });

  it('retorna null/undefined inalterado', () => {
    expect(driveUrlToThumbnail(null)).toBeNull();
    expect(driveUrlToThumbnail(undefined)).toBeUndefined();
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
