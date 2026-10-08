const { eventoFromRow, fotoFromRow, rows } = require('./google-sheets.shared');

function numberValue(value) {
  return Number(String(value || '0').replace(',', '.')) || 0;
}

function dateValue(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthIso() {
  return new Date().toISOString().slice(0, 7);
}

function pedidoFromRow(row) {
  return {
    id: row.get('PedidoID') || '',
    preferenceId: row.get('PreferenceID') || '',
    paymentId: row.get('PaymentID') || '',
    status: row.get('Status') || '',
    name: row.get('Nome') || '',
    email: row.get('Email') || '',
    whatsapp: row.get('WhatsApp') || '',
    paymentMethod: row.get('MeioPagamento') || '',
    totalBeforeDiscount: numberValue(row.get('TotalAntesDesconto') || row.get('Total')),
    discountTotal: numberValue(row.get('DescontoTotal')),
    total: numberValue(row.get('Total')),
    couponCode: row.get('CupomCodigo') || '',
    packageId: row.get('PacoteID') || '',
    createdAt: row.get('DataCriacao') || '',
    paidAt: row.get('DataPagamento') || '',
    emailStatus: row.get('EmailStatus') || '',
    emailError: row.get('EmailErro') || '',
    whatsappLink: row.get('WhatsAppLink') || '',
  };
}

function itemFromRow(row, photoMap, eventMap) {
  const fotoId = row.get('FotoID') || '';
  const eventoId = row.get('EventoID') || '';
  const photo = photoMap.get(fotoId);
  const event = eventMap.get(eventoId);
  return {
    fotoId,
    eventoId,
    price: numberValue(row.get('PrecoUnitario')),
    photoTitle: photo?.title || photo?.id || fotoId,
    eventTitle: event?.title || eventoId,
  };
}

function downloadFromRow(row) {
  return {
    downloadId: row.get('DownloadID') || '',
    pedidoId: row.get('PedidoID') || '',
    fotoId: row.get('FotoID') || '',
    expiresAt: row.get('ExpiraEm') || '',
    uses: numberValue(row.get('Usos')),
    maxUses: numberValue(row.get('UsosMaximos')),
    createdAt: row.get('CriadoEm') || '',
    lastUseAt: row.get('UltimoUsoEm') || '',
    fingerprintStatus: row.get('FingerprintStatus') || '',
  };
}

async function dashboardPascom() {
  const [pedidoRows, downloadRows, eventoRows] = await Promise.all([
    rows('Pedidos'),
    rows('Downloads'),
    rows('Eventos'),
  ]);
  const pedidos = pedidoRows.map(pedidoFromRow);
  const today = todayIso();
  const month = monthIso();
  const approved = pedidos.filter((pedido) => pedido.status === 'Pagamento Confirmado');
  const isToday = (pedido) => String(pedido.paidAt || pedido.createdAt).startsWith(today);
  const isMonth = (pedido) => String(pedido.paidAt || pedido.createdAt).startsWith(month);
  return {
    ordersToday: pedidos.filter(isToday).length,
    revenueToday: approved.filter(isToday).reduce((sum, pedido) => sum + pedido.total, 0),
    ordersMonth: pedidos.filter(isMonth).length,
    revenueMonth: approved.filter(isMonth).reduce((sum, pedido) => sum + pedido.total, 0),
    pendingOrders: pedidos.filter((pedido) => /pendente|pending|in_process/i.test(pedido.status)).length,
    activeDownloads: downloadRows.map(downloadFromRow).filter((download) => {
      const expires = dateValue(download.expiresAt);
      return expires && expires.getTime() > Date.now() && download.uses < download.maxUses;
    }).length,
    publishedEvents: eventoRows.map(eventoFromRow).filter((event) => event.publication === 'publicado').length,
    deliveryIssues: pedidos.filter((pedido) => pedido.emailStatus === 'erro' || pedido.status === 'PagamentoDivergente').length,
  };
}

async function listarPedidosPascom({ status = '', q = '', dataInicio = '', dataFim = '', limit = 100 } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  const max = Math.min(Number(limit) || 100, 200);
  const pedidos = (await rows('Pedidos')).map(pedidoFromRow).filter((pedido) => {
    if (status && pedido.status !== status) return false;
    if (dataInicio && String(pedido.createdAt).slice(0, 10) < dataInicio) return false;
    if (dataFim && String(pedido.createdAt).slice(0, 10) > dataFim) return false;
    if (!needle) return true;
    return `${pedido.id} ${pedido.name} ${pedido.email} ${pedido.whatsapp} ${pedido.status}`.toLowerCase().includes(needle);
  });
  return pedidos
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, max);
}

async function detalharPedidoPascom(pedidoId) {
  const [pedidoRows, itemRows, downloadRows, fotoRows, eventoRows] = await Promise.all([
    rows('Pedidos'),
    rows('ItensPedido'),
    rows('Downloads'),
    rows('Fotos'),
    rows('Eventos'),
  ]);
  const pedidoRow = pedidoRows.find((row) => row.get('PedidoID') === pedidoId);
  if (!pedidoRow) return null;
  const photos = new Map(fotoRows.map(fotoFromRow).map((photo) => [photo.id, photo]));
  const events = new Map(eventoRows.map(eventoFromRow).map((event) => [event.eventoId, event]));
  return {
    pedido: pedidoFromRow(pedidoRow),
    itens: itemRows
      .filter((row) => row.get('PedidoID') === pedidoId)
      .map((row) => itemFromRow(row, photos, events)),
    downloads: downloadRows
      .filter((row) => row.get('PedidoID') === pedidoId)
      .map(downloadFromRow),
  };
}

module.exports = {
  dashboardPascom,
  detalharPedidoPascom,
  listarPedidosPascom,
  pedidoFromRow,
};
