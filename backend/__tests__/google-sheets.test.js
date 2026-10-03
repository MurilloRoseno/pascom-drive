jest.mock('google-spreadsheet', () => ({ GoogleSpreadsheet: jest.fn() }));
jest.mock('google-auth-library', () => ({ JWT: jest.fn() }));

function row(data) {
  return { get: (key) => data[key], set: jest.fn((key, value) => { data[key] = value; }), save: jest.fn().mockResolvedValue() };
}

const eventRows = [
  row({ EventoID: 'EV1', Titulo: 'Padre Paulo Na FranÇA_202605261456', Categoria: 'celebracoes', DataEvento: '2026-05-26', HorarioEvento: '15:32', Publicacao: 'publicado', Visibilidade: 'publica', VendaAutorizada: 'SIM' }),
  row({ EventoID: 'EV2', Titulo: 'Rascunho', Publicacao: 'rascunho', Visibilidade: 'protegida', VendaAutorizada: 'NAO' }),
];
const photoRows = [
  row({ FotoID: 'CAPA1', EventoID: 'EV1', TipoFoto: 'capa', PreviewFileID: 'COVER_1', ThumbnailFileID: 'COVER_THUMB', OriginalFileID: 'PRIVATE_COVER', StatusProcessamento: 'Processada', DisponivelVenda: 'SIM', PrecoUnitario: '10' }),
  row({ FotoID: 'F1', EventoID: 'EV1', PreviewFileID: 'PREVIEW_1', ThumbnailFileID: 'THUMB_1', OriginalFileID: 'PRIVATE_1', StatusProcessamento: 'Processada', DisponivelVenda: 'SIM', PrecoUnitario: '10' }),
  row({ FotoID: 'F2', EventoID: 'EV2', PreviewFileID: 'PREVIEW_2', OriginalFileID: 'PRIVATE_2', StatusProcessamento: 'Processada', DisponivelVenda: 'SIM', PrecoUnitario: '10' }),
  row({ FotoID: 'F3', EventoID: 'EV1', PreviewFileID: 'PREVIEW_LEGACY', OriginalFileID: 'PRIVATE_LEGACY', StatusProcessamento: 'Processada', PrecoUnitario: '10' }),
];
const pedidoRow = row({ PedidoID: 'PED_1', Status: 'Pagamento Confirmado', Email: 'maria@example.com' });
const itemRows = [row({ PedidoID: 'PED_1', FotoID: 'F1', EventoID: 'EV1' })];
const downloadRows = [
  row({
    DownloadID: 'DL_1',
    PedidoID: 'PED_1',
    FotoID: 'F1',
    OriginalFileID: 'PRIVATE_1',
    TokenHash: 'hash-ok',
    ExpiraEm: new Date(Date.now() + 60000).toISOString(),
    UsosMaximos: '1',
    Usos: '0',
  }),
  row({
    DownloadID: 'DL_NOT_BOUGHT',
    PedidoID: 'PED_1',
    FotoID: 'F999',
    OriginalFileID: 'PRIVATE_999',
    TokenHash: 'hash-ok',
    ExpiraEm: new Date(Date.now() + 60000).toISOString(),
    UsosMaximos: '1',
    Usos: '0',
  }),
];
const webhookRows = [row({ ChaveEvento: 'REQ_1:PAY_1:payment.updated', Status: 'Processado' })];
const sheets = {
  Eventos: { getRows: jest.fn().mockResolvedValue(eventRows) },
  Fotos: { getRows: jest.fn().mockResolvedValue(photoRows) },
  Pedidos: { addRow: jest.fn().mockResolvedValue(), getRows: jest.fn().mockResolvedValue([pedidoRow]) },
  ItensPedido: { addRow: jest.fn().mockResolvedValue(), getRows: jest.fn().mockResolvedValue(itemRows) },
  Downloads: { getRows: jest.fn().mockResolvedValue(downloadRows) },
  Webhooks: { getRows: jest.fn().mockResolvedValue(webhookRows) },
};
const { GoogleSpreadsheet } = require('google-spreadsheet');
GoogleSpreadsheet.mockImplementation(() => ({ loadInfo: jest.fn().mockResolvedValue(), sheetsByTitle: sheets }));

const {
  driveUrlToThumbnail, listarEventosPublicados, listarFotosEvento, registrarPedido, registrarEntrega,
  prepararDownload, auditarConsistenciaComercial, buscarPedidoByPreferenceOrPayment, buscarPedidoById, listarRegrasPagamento,
} = require('../lib/google-sheets');

it('lista apenas evento publicado e remove configuracao secreta', async () => {
  expect(await listarEventosPublicados()).toEqual([expect.objectContaining({
    eventoId: 'EV1',
    title: 'Padre Paulo Na França',
    dateLabel: '26 de maio de 2026',
    time: '15:32',
    cover: '/api/eventos/EV1/previews/CAPA1',
    coverThumbnail: '/api/eventos/EV1/previews/CAPA1?variant=thumbnail',
  })]);
});

it('separa preview processado da autorizacao comercial da foto', async () => {
  const photos = await listarFotosEvento('EV2');
  expect(photos).toHaveLength(1);
  expect(photos[0].previewUrl).toBe('/api/eventos/EV2/previews/F2');
  expect(photos[0]).not.toHaveProperty('previewFileId');
  expect(photos[0]).not.toHaveProperty('originalFileId');
});

it('envia thumbnail leve distinta quando o derivado ja foi gerado', async () => {
  const photos = await listarFotosEvento('EV1');
  expect(photos[0].thumbnailUrl).toBe('/api/eventos/EV1/previews/F1?variant=thumbnail');
  expect(photos[0].previewUrl).toBe('/api/eventos/EV1/previews/F1');
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

it('persiste status e falha do envio de e-mail preservando WhatsApp assistido', async () => {
  await registrarEntrega('PED_1', {
    emailResult: { status: 'falhou', error: 'SMTP indisponivel', attemptedAt: '2026-05-26T12:00:00.000Z' },
    whatsappLink: 'https://wa.me/5599982061089',
  });

  expect(pedidoRow.set).toHaveBeenCalledWith('EmailStatus', 'falhou');
  expect(pedidoRow.set).toHaveBeenCalledWith('EmailErro', 'SMTP indisponivel');
  expect(pedidoRow.set).toHaveBeenCalledWith('EmailUltimaTentativaEm', '2026-05-26T12:00:00.000Z');
  expect(pedidoRow.set).toHaveBeenCalledWith('WhatsAppLink', 'https://wa.me/5599982061089');
});

it('gera apenas thumbnail de preview com limite de tamanho', () => {
  expect(driveUrlToThumbnail('https://drive.google.com/file/d/abc123/view')).toContain('sz=w1280');
});

it('autoriza download somente quando pedido esta pago e item foi comprado', async () => {
  await expect(prepararDownload('DL_1', 'hash-ok')).resolves.toEqual(expect.objectContaining({
    pedidoId: 'PED_1',
    fotoId: 'F1',
    originalFileId: 'PRIVATE_1',
  }));
  await expect(prepararDownload('DL_NOT_BOUGHT', 'hash-ok')).resolves.toBeNull();
});

it('audita inconsistencias comerciais em pedidos, downloads e webhooks', async () => {
  downloadRows.push(row({
    DownloadID: 'DL_BAD',
    PedidoID: 'PED_1',
    FotoID: 'F999',
    OriginalFileID: 'PRIVATE_BAD',
    TokenHash: 'hash-ok',
    ExpiraEm: new Date(Date.now() + 60000).toISOString(),
    UsosMaximos: '1',
    Usos: '0',
  }));
  try {
    await expect(auditarConsistenciaComercial()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'download_without_purchased_item',
        downloadId: 'DL_BAD',
        severity: 'critical',
      }),
    ]));
  } finally {
    downloadRows.pop();
  }
});

describe('números no formato brasileiro (a planilha devolve "13,95")', () => {
  it('o total do pedido lido da planilha vira número, para a conferência do webhook em centavos', async () => {
    sheets.Pedidos.getRows.mockResolvedValueOnce([row({ PedidoID: 'PED_BR', PreferenceID: 'cs_test_br', Status: 'Pagamento Pendente', Total: '13,95', DescontoTotal: '1,5', TotalAntesDesconto: '15,45' })]);
    const pedido = await buscarPedidoByPreferenceOrPayment('PED_BR');
    expect(pedido.total).toBe(13.95);
    expect(Math.round(pedido.total * 100)).toBe(1395);
    sheets.Pedidos.getRows.mockResolvedValueOnce([row({ PedidoID: 'PED_BR', Total: '13,95', DescontoTotal: '1,5', TotalAntesDesconto: '15,45' })]);
    expect(await buscarPedidoById('PED_BR')).toMatchObject({ total: 13.95, discountTotal: 1.5, totalBeforeDiscount: 15.45 });
  });

  it('as tarifas da aba RegrasPagamento ("0,99") viram número, não NaN', async () => {
    sheets.RegrasPagamento = { getRows: jest.fn().mockResolvedValue([row({ MeioPagamento: 'pix', PercentualEstimado: '0,99', ValorFixo: '0,30', Ativo: 'SIM' })]) };
    expect(await listarRegrasPagamento()).toEqual([{ method: 'pix', percentage: 0.99, fixed: 0.3, activeFrom: '' }]);
  });
});
