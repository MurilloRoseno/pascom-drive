const crypto = require('crypto');
const { rows, sheet, fotoFromRow } = require('./google-sheets.shared');
const { incrementarUsoCupom } = require('./commercial-rules');

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
    TotalAntesDesconto: pedido.pricing.totalBeforeDiscount,
    CupomCodigo: pedido.couponCode || '',
    DescontoTotal: pedido.pricing.discountTotal || 0,
    PacoteID: pedido.packageId || '',
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
  if (pedido.couponCode) await incrementarUsoCupom(pedido.couponCode);
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
    name: match.get('Nome') || '',
    email: match.get('Email'),
    whatsapp: match.get('WhatsApp'),
    emailStatus: match.get('EmailStatus') || '',
    emailError: match.get('EmailErro') || '',
    emailSentAt: match.get('EmailEnviadoEm') || '',
    deliveryAttempts: Number(match.get('EntregaTentativas') || 0),
    deliveryNextAt: match.get('EntregaProximaEm') || '',
    total: Number(match.get('Total') || 0),
    createdAt: match.get('DataCriacao') || '',
    paidAt: match.get('DataPagamento') || '',
    totalBeforeDiscount: Number(match.get('TotalAntesDesconto') || match.get('Total') || 0),
    discountTotal: Number(match.get('DescontoTotal') || 0),
    couponCode: match.get('CupomCodigo') || '',
    packageId: match.get('PacoteID') || '',
  };
}

async function buscarPedidoByPreferenceOrPayment(reference) {
  const match = (await rows('Pedidos')).find((row) =>
    row.get('PedidoID') === reference ||
    row.get('PreferenceID') === reference ||
    row.get('PaymentID') === reference
  );
  return match ? {
    row: match,
    id: match.get('PedidoID'),
    total: Number(match.get('Total') || 0),
    status: match.get('Status'),
  } : null;
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

async function marcarPedidoDivergente(pedidoId, reason, payment = {}) {
  const pedido = await buscarPedidoById(pedidoId);
  if (!pedido) throw new Error('Pedido nao encontrado.');
  pedido.row.set('PaymentID', String(payment.id || pedido.paymentId || ''));
  pedido.row.set('Status', 'PagamentoDivergente');
  pedido.row.set('EmailErro', reason);
  await pedido.row.save();
  return { ...pedido, status: 'PagamentoDivergente' };
}

async function registrarEntrega(pedidoId, { emailResult, whatsappLink, tentativas, proximaEm } = {}) {
  const pedido = await buscarPedidoById(pedidoId);
  if (!pedido) throw new Error('Pedido nao encontrado.');
  if (emailResult) {
    pedido.row.set('EmailStatus', emailResult.status);
    pedido.row.set('EmailErro', emailResult.error || '');
    pedido.row.set('EmailUltimaTentativaEm', emailResult.attemptedAt || new Date().toISOString());
    if (emailResult.status === 'enviado') pedido.row.set('EmailEnviadoEm', new Date().toISOString());
  }
  if (whatsappLink) pedido.row.set('WhatsAppLink', whatsappLink);
  // Colunas novas (fase 5): planilha antiga continua funcionando sem elas.
  if (tentativas !== undefined) safeSet(pedido.row, 'EntregaTentativas', tentativas);
  if (proximaEm !== undefined) safeSet(pedido.row, 'EntregaProximaEm', proximaEm);
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

async function listarDownloadsPedido(pedidoId) {
  return (await rows('Downloads'))
    .filter((row) => row.get('PedidoID') === pedidoId)
    .map((row) => ({
      row,
      downloadId: row.get('DownloadID'),
      fotoId: row.get('FotoID'),
      expiresAt: row.get('ExpiraEm') || '',
      uses: Number(row.get('Usos') || 0),
      maxUses: Number(row.get('UsosMaximos') || 0),
    }));
}

/**
 * Grava as autorizacoes do pedido: atualiza a linha que ja existe para a foto e cria
 * apenas as que faltam. Substituir o TokenHash revoga o link anterior, entao reemitir
 * nao acumula linhas nem deixa dois links validos para a mesma foto.
 */
async function gravarAutorizacoesDownload(pedidoId, tokenRecords) {
  const target = await sheet('Downloads');
  if (!target) throw new Error('Estrutura de downloads nao inicializada no Sheets.');
  const existentes = new Map((await target.getRows())
    .filter((row) => row.get('PedidoID') === pedidoId)
    .map((row) => [row.get('FotoID'), row]));
  const novos = [];
  for (const record of tokenRecords) {
    const row = existentes.get(record.fotoId);
    if (!row) {
      novos.push(record);
      continue;
    }
    row.set('OriginalFileID', record.originalFileId);
    row.set('TokenHash', record.tokenHash);
    row.set('ExpiraEm', new Date(record.exp).toISOString());
    row.set('UsosMaximos', record.maxUses);
    row.set('Usos', 0);
    row.set('CriadoEm', new Date().toISOString());
    safeSet(row, 'FingerprintID', record.fingerprintId);
    safeSet(row, 'FingerprintHash', record.fingerprintHash);
    safeSet(row, 'FingerprintVersao', record.fingerprintVersion);
    safeSet(row, 'FingerprintStatus', 'Pendente');
    safeSet(row, 'FingerprintAplicadoEm', '');
    safeSet(row, 'UltimoUsoEm', '');
    await row.save();
  }
  if (novos.length) await criarAutorizacoesDownload(pedidoId, novos);
}

async function prepararDownload(downloadId, tokenHash) {
  const downloadRows = await rows('Downloads');
  const row = downloadRows.find((item) => item.get('DownloadID') === downloadId);
  if (!row || row.get('TokenHash') !== tokenHash) return null;
  if (Date.now() > new Date(row.get('ExpiraEm')).getTime()) return null;
  const uses = Number(row.get('Usos') || 0);
  const maxUses = Number(row.get('UsosMaximos') || 1);
  if (uses >= maxUses) return null;
  const pedidoId = row.get('PedidoID');
  const fotoId = row.get('FotoID');
  const pedido = (await rows('Pedidos')).find((item) => item.get('PedidoID') === pedidoId);
  if (!pedido || pedido.get('Status') !== 'Pagamento Confirmado') return null;
  const itemComprado = (await rows('ItensPedido')).some((item) =>
    item.get('PedidoID') === pedidoId && item.get('FotoID') === fotoId
  );
  if (!itemComprado) return null;
  return {
    row,
    downloadId: row.get('DownloadID'),
    pedidoId,
    originalFileId: row.get('OriginalFileID'),
    fotoId,
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

async function auditarConsistenciaComercial() {
  const [pedidos, itens, downloads, webhooks] = await Promise.all([
    rows('Pedidos'),
    rows('ItensPedido'),
    rows('Downloads'),
    rows('Webhooks'),
  ]);
  const findings = [];
  const itensPorPedido = new Map();
  itens.forEach((item) => {
    const pedidoId = item.get('PedidoID');
    if (!itensPorPedido.has(pedidoId)) itensPorPedido.set(pedidoId, new Set());
    itensPorPedido.get(pedidoId).add(item.get('FotoID'));
  });
  const downloadsPorPedido = new Map();
  downloads.forEach((download) => {
    const pedidoId = download.get('PedidoID');
    if (!downloadsPorPedido.has(pedidoId)) downloadsPorPedido.set(pedidoId, []);
    downloadsPorPedido.get(pedidoId).push(download);
    if (!itensPorPedido.get(pedidoId)?.has(download.get('FotoID'))) {
      findings.push({
        severity: 'critical',
        type: 'download_without_purchased_item',
        pedidoId,
        fotoId: download.get('FotoID'),
        downloadId: download.get('DownloadID'),
      });
    }
  });
  pedidos.forEach((pedido) => {
    const pedidoId = pedido.get('PedidoID');
    if (pedido.get('Status') === 'Pagamento Confirmado' && !downloadsPorPedido.has(pedidoId)) {
      findings.push({ severity: 'high', type: 'paid_order_without_downloads', pedidoId });
    }
    if (pedido.get('Status') === 'PagamentoDivergente') {
      findings.push({ severity: 'critical', type: 'payment_divergent', pedidoId });
    }
  });
  const webhookKeys = new Set();
  webhooks.forEach((webhook) => {
    const key = webhook.get('ChaveEvento');
    if (webhookKeys.has(key)) {
      findings.push({ severity: 'medium', type: 'duplicated_webhook_key', webhookKey: key });
    }
    webhookKeys.add(key);
  });
  return findings;
}

function novoPedidoId() {
  return `PED_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = {
  registrarPedido,
  buscarPedidoById,
  buscarPedidoByPreferenceOrPayment,
  atualizarPedidoPagamento,
  marcarPedidoDivergente,
  registrarEntrega,
  registrarWebhookSeNovo,
  finalizarWebhook,
  listarItensPedido,
  buscarOriginaisPedido,
  criarAutorizacoesDownload,
  listarDownloadsPedido,
  gravarAutorizacoesDownload,
  prepararDownload,
  registrarUsoDownload,
  consumirDownload,
  auditarConsistenciaComercial,
  novoPedidoId,
};
