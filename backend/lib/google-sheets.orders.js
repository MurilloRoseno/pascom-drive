const crypto = require('crypto');
const { rows, sheet, fotoFromRow } = require('./google-sheets.shared');

async function registrarPedido(pedido, itens) {
  const pedidos = await sheet('Pedidos');
  const itensSheet = await sheet('ItensPedido');
  if (!pedidos || !itensSheet) throw new Error('Estrutura de pedidos nao inicializada no Sheets.');
  await pedidos.addRow({
    PedidoID: pedido.id,
    PreferenceID: pedido.preferenceId,
    PaymentID: '',
    Status: 'Pagamento Pendente',
    Nome: pedido.name,
    Email: pedido.email,
    WhatsApp: pedido.whatsapp,
    MeioPagamento: pedido.paymentMethod,
    Subtotal: pedido.pricing.subtotal,
    TaxaServico: pedido.pricing.serviceFee,
    TaxaComodidade: pedido.pricing.convenienceFee,
    CustoPagamentoEstimado: pedido.pricing.paymentCost,
    Total: pedido.pricing.total,
    TarifaReal: '',
    DataCriacao: new Date().toISOString(),
  });
  await Promise.all(itens.map((item) => itensSheet.addRow({
    PedidoID: pedido.id,
    FotoID: item.foto.id,
    EventoID: item.foto.eventoId,
    PrecoUnitario: item.foto.price,
  })));
}

async function buscarPedidoById(pedidoId) {
  const match = (await rows('Pedidos')).find((row) => row.get('PedidoID') === pedidoId);
  if (!match) return null;
  return {
    row: match,
    id: match.get('PedidoID'),
    preferenceId: match.get('PreferenceID'),
    paymentId: match.get('PaymentID') || '',
    status: match.get('Status'),
    email: match.get('Email'),
    whatsapp: match.get('WhatsApp'),
    total: Number(match.get('Total') || 0),
  };
}

async function buscarPedidoByPreferenceOrPayment(reference) {
  const match = (await rows('Pedidos')).find((row) =>
    row.get('PedidoID') === reference ||
    row.get('PreferenceID') === reference ||
    row.get('PaymentID') === reference
  );
  return match ? { row: match, id: match.get('PedidoID') } : null;
}

async function atualizarPedidoPagamento(pedidoId, payment) {
  const pedido = await buscarPedidoById(pedidoId);
  if (!pedido) throw new Error('Pedido nao encontrado.');
  pedido.row.set('PaymentID', String(payment.id));
  pedido.row.set('Status', payment.status === 'approved' ? 'Pagamento Confirmado' : payment.status);
  const fee = Array.isArray(payment.fee_details)
    ? payment.fee_details.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    : '';
  pedido.row.set('TarifaReal', fee);
  if (payment.status === 'approved') pedido.row.set('DataPagamento', new Date().toISOString());
  await pedido.row.save();
  return { ...pedido, status: payment.status };
}

async function registrarEntrega(pedidoId, { emailResult, whatsappLink }) {
  const pedido = await buscarPedidoById(pedidoId);
  if (!pedido) throw new Error('Pedido nao encontrado.');
  if (emailResult) {
    pedido.row.set('EmailStatus', emailResult.status);
    pedido.row.set('EmailErro', emailResult.error || '');
    pedido.row.set('EmailUltimaTentativaEm', emailResult.attemptedAt || new Date().toISOString());
    if (emailResult.status === 'enviado') pedido.row.set('EmailEnviadoEm', new Date().toISOString());
  }
  if (whatsappLink) pedido.row.set('WhatsAppLink', whatsappLink);
  await pedido.row.save();
}

async function registrarWebhookSeNovo(key, paymentId, type) {
  const webhookSheet = await sheet('Webhooks');
  if (!webhookSheet) throw new Error('Estrutura de webhooks nao inicializada no Sheets.');
  const existing = (await webhookSheet.getRows()).find((row) => row.get('ChaveEvento') === key);
  if (existing) return existing.get('Status') !== 'Processado';
  await webhookSheet.addRow({
    ChaveEvento: key,
    PaymentID: paymentId,
    Tipo: type,
    RecebidoEm: new Date().toISOString(),
    ProcessadoEm: '',
    Status: 'Recebido',
  });
  return true;
}

async function finalizarWebhook(key, status) {
  const webhookRows = await rows('Webhooks');
  const row = webhookRows.find((item) => item.get('ChaveEvento') === key);
  if (!row) return;
  row.set('ProcessadoEm', new Date().toISOString());
  row.set('Status', status);
  await row.save();
}

async function listarItensPedido(pedidoId) {
  return (await rows('ItensPedido'))
    .filter((row) => row.get('PedidoID') === pedidoId)
    .map((row) => ({ fotoId: row.get('FotoID'), eventoId: row.get('EventoID') }));
}

async function buscarOriginaisPedido(pedidoId) {
  const itens = await listarItensPedido(pedidoId);
  const itemIds = new Set(itens.map((item) => item.fotoId));
  return (await rows('Fotos'))
    .map(fotoFromRow)
    .filter((foto) => itemIds.has(foto.id) && foto.originalFileId)
    .map((foto) => ({ fotoId: foto.id, originalFileId: foto.originalFileId }));
}

async function criarAutorizacoesDownload(pedidoId, tokenRecords) {
  const target = await sheet('Downloads');
  if (!target) throw new Error('Estrutura de downloads nao inicializada no Sheets.');
  await Promise.all(tokenRecords.map((record) => target.addRow({
    DownloadID: record.id,
    PedidoID: pedidoId,
    FotoID: record.fotoId,
    OriginalFileID: record.originalFileId,
    TokenHash: record.tokenHash,
    FingerprintID: record.fingerprintId,
    FingerprintHash: record.fingerprintHash,
    FingerprintVersao: record.fingerprintVersion,
    FingerprintStatus: 'Pendente',
    FingerprintAplicadoEm: '',
    ExpiraEm: new Date(record.exp).toISOString(),
    UsosMaximos: record.maxUses,
    Usos: 0,
    CriadoEm: new Date().toISOString(),
  })));
}

async function prepararDownload(downloadId, tokenHash) {
  const downloadRows = await rows('Downloads');
  const row = downloadRows.find((item) => item.get('DownloadID') === downloadId);
  if (!row || row.get('TokenHash') !== tokenHash) return null;
  if (Date.now() > new Date(row.get('ExpiraEm')).getTime()) return null;
  const uses = Number(row.get('Usos') || 0);
  const maxUses = Number(row.get('UsosMaximos') || 1);
  if (uses >= maxUses) return null;
  return {
    row,
    downloadId: row.get('DownloadID'),
    pedidoId: row.get('PedidoID'),
    originalFileId: row.get('OriginalFileID'),
    fotoId: row.get('FotoID'),
    fingerprintId: row.get('FingerprintID') || '',
    fingerprintHash: row.get('FingerprintHash') || '',
    fingerprintVersion: row.get('FingerprintVersao') || '',
  };
}

function safeSet(row, field, value) {
  try {
    row.set(field, value);
  } catch (_error) {
    // Older spreadsheets may not have received the new forensic columns yet.
  }
}

async function registrarUsoDownload(downloadId, tokenHash, fingerprint = {}) {
  const downloadRows = await rows('Downloads');
  const row = downloadRows.find((item) => item.get('DownloadID') === downloadId);
  if (!row || row.get('TokenHash') !== tokenHash) return false;
  const uses = Number(row.get('Usos') || 0);
  row.set('Usos', uses + 1);
  row.set('UltimoUsoEm', new Date().toISOString());
  safeSet(row, 'FingerprintID', fingerprint.fingerprintId || row.get('FingerprintID') || '');
  safeSet(row, 'FingerprintHash', fingerprint.fingerprintHash || row.get('FingerprintHash') || '');
  safeSet(row, 'FingerprintVersao', fingerprint.fingerprintVersion || row.get('FingerprintVersao') || '');
  safeSet(row, 'FingerprintStatus', fingerprint.status || 'Aplicado');
  safeSet(row, 'FingerprintAplicadoEm', fingerprint.appliedAt || new Date().toISOString());
  await row.save();
  return true;
}

async function consumirDownload(downloadId, tokenHash) {
  const authorized = await prepararDownload(downloadId, tokenHash);
  if (!authorized) return null;
  await registrarUsoDownload(downloadId, tokenHash);
  return { originalFileId: authorized.originalFileId, fotoId: authorized.fotoId };
}

function novoPedidoId() {
  return `PED_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = {
  registrarPedido,
  buscarPedidoById,
  buscarPedidoByPreferenceOrPayment,
  atualizarPedidoPagamento,
  registrarEntrega,
  registrarWebhookSeNovo,
  finalizarWebhook,
  listarItensPedido,
  buscarOriginaisPedido,
  criarAutorizacoesDownload,
  prepararDownload,
  registrarUsoDownload,
  consumirDownload,
  novoPedidoId,
};
