jest.mock('google-spreadsheet', () => ({ GoogleSpreadsheet: jest.fn() }));
jest.mock('google-auth-library', () => ({ JWT: jest.fn() }));

function row(data) {
  return { get: (key) => data[key], set: jest.fn((key, value) => { data[key] = value; }), save: jest.fn().mockResolvedValue() };
}

const eventRows = [
  row({ EventoID: 'EV1', Titulo: 'Missa', Categoria: 'celebracoes', Publicacao: 'publicado', Visibilidade: 'publica', VendaAutorizada: 'SIM' }),
  row({ EventoID: 'EV2', Titulo: 'Rascunho', Publicacao: 'rascunho', Visibilidade: 'protegida', VendaAutorizada: 'NAO' }),
];
const photoRows = [
  row({ FotoID: 'F1', EventoID: 'EV1', PreviewFileID: 'PREVIEW_1', OriginalFileID: 'PRIVATE_1', StatusProcessamento: 'Processada', DisponivelVenda: 'SIM', PrecoUnitario: '10' }),
  row({ FotoID: 'F2', EventoID: 'EV2', PreviewFileID: 'PREVIEW_2', OriginalFileID: 'PRIVATE_2', StatusProcessamento: 'Processada', DisponivelVenda: 'SIM', PrecoUnitario: '10' }),
  row({ FotoID: 'F3', EventoID: 'EV1', PreviewFileID: 'PREVIEW_LEGACY', OriginalFileID: 'PRIVATE_LEGACY', StatusProcessamento: 'Processada', PrecoUnitario: '10' }),
];
const sheets = {
  Eventos: { getRows: jest.fn().mockResolvedValue(eventRows) },
  Fotos: { getRows: jest.fn().mockResolvedValue(photoRows) },
  Pedidos: { addRow: jest.fn().mockResolvedValue() },
  ItensPedido: { addRow: jest.fn().mockResolvedValue() },
};
const { GoogleSpreadsheet } = require('google-spreadsheet');
GoogleSpreadsheet.mockImplementation(() => ({ loadInfo: jest.fn().mockResolvedValue(), sheetsByTitle: sheets }));

const {
  driveUrlToThumbnail, listarEventosPublicados, listarFotos, listarFotosEvento, registrarPedido,
} = require('../lib/google-sheets');

it('lista apenas evento publicado e remove configuracao secreta', async () => {
  expect(await listarEventosPublicados()).toEqual([expect.objectContaining({ eventoId: 'EV1', title: 'Missa' })]);
});

it('expoe apenas preview explicitamente liberado de evento publico, nunca original', async () => {
  const photos = await listarFotos();
  expect(photos).toHaveLength(1);
  expect(photos[0].url).toContain('PREVIEW_1');
  expect(photos[0]).not.toHaveProperty('originalFileId');
});

it('separa preview processado da autorizacao comercial da foto', async () => {
  const photos = await listarFotosEvento('EV2');
  expect(photos).toHaveLength(1);
  expect(photos[0]).not.toHaveProperty('originalFileId');
});

it('registra pedidos e itens em abas separadas', async () => {
  await registrarPedido({
    id: 'PED_1', preferenceId: 'PREF_1', name: 'Maria', email: 'maria@example.com',
    whatsapp: '99982061089', paymentMethod: 'pix',
    pricing: { subtotal: 10, serviceFee: 2, convenienceFee: 1, paymentCost: 0.2, total: 13.2 },
  }, [{ foto: { id: 'F1', eventoId: 'EV1', price: 10 } }]);
  expect(sheets.Pedidos.addRow).toHaveBeenCalled();
  expect(sheets.ItensPedido.addRow).toHaveBeenCalledWith(expect.objectContaining({ FotoID: 'F1' }));
});

it('gera apenas thumbnail de preview com limite de tamanho', () => {
  expect(driveUrlToThumbnail('https://drive.google.com/file/d/abc123/view')).toContain('sz=w1280');
});
