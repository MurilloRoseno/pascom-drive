const crypto = require('crypto');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

function drivePreviewUrl(fileId) {
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280` : '';
}

function applicationPreviewUrl(eventoId, fotoId) {
  return `/api/eventos/${encodeURIComponent(eventoId)}/previews/${encodeURIComponent(fotoId)}`;
}

function driveUrlToThumbnail(sharingUrl) {
  const match = sharingUrl && sharingUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? drivePreviewUrl(match[1]) : sharingUrl;
}

function yes(value) {
  return String(value || '').toUpperCase() === 'SIM' || value === true;
}

let _doc = null;

async function getDoc() {
  if (_doc) return _doc;
  const encodedKey = process.env.GOOGLE_PRIVATE_KEY_B64;
  const privateKey = encodedKey
    ? Buffer.from(encodedKey, 'base64').toString('utf8')
    : String(process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
  await _doc.loadInfo();
  return _doc;
}

async function sheet(title) {
  const doc = await getDoc();
  return doc.sheetsByTitle[title] || null;
}

async function rows(title) {
  const target = await sheet(title);
  return target ? target.getRows() : [];
}

function eventoFromRow(row) {
  return {
    eventoId: row.get('EventoID'),
    title: row.get('Titulo') || row.get('NomePasta'),
    nomePasta: row.get('NomePasta'),
    category: row.get('Categoria') || '',
    date: row.get('DataEvento') || '',
    visibility: row.get('Visibilidade') || 'protegida',
    salesAuthorized: yes(row.get('VendaAutorizada')),
    publication: row.get('Publicacao') || 'rascunho',
    minorProtection: yes(row.get('ProtecaoMenores')),
    codeHash: row.get('CodigoHash') || '',
    codeVersion: Number(row.get('CodigoVersao') || 0),
    status: row.get('StatusProcessamento') || row.get('Status') || '',
    totalFotos: Number(row.get('TotalFotos') || 0),
    fotosProcessadas: Number(row.get('FotosProcessadas') || 0),
    dataCriacao: row.get('DataCriacao') || '',
  };
}

function fotoFromRow(row) {
  const id = row.get('FotoID') || row.get('ID');
  const previewId = row.get('PreviewFileID');
  return {
    id,
    eventoId: row.get('EventoID') || '',
    previewFileId: previewId || '',
    previewUrl: previewId ? drivePreviewUrl(previewId) : driveUrlToThumbnail(row.get('Link_Amostra')),
    price: Number(row.get('PrecoUnitario') || row.get('Preco') || 10),
    // Fail closed: legacy or incomplete rows are not saleable without explicit approval.
    availableForSale: yes(row.get('DisponivelVenda')),
    status: row.get('StatusProcessamento') || row.get('Status'),
    originalFileId: row.get('OriginalFileID') || '',
  };
}

async function listarEventos() {
  return (await rows('Eventos')).map(eventoFromRow);
}

async function listarEventosPublicados({ categoria = '', q = '' } = {}) {
  const term = q.trim().toLowerCase();
  const events = (await listarEventos())
    .filter((event) => event.publication === 'publicado')
    .filter((event) => !categoria || event.category === categoria)
    .filter((event) => !term || `${event.title} ${event.category} ${event.date}`.toLowerCase().includes(term));
  const photoRows = (await rows('Fotos')).map(fotoFromRow);
  return events.map((event) => {
      const publicEvent = { ...event };
      delete publicEvent.codeHash;
      delete publicEvent.codeVersion;
      if (event.visibility === 'publica') {
        const firstPhoto = photoRows.find((foto) =>
          foto.eventoId === event.eventoId && foto.status === 'Processada' && foto.previewFileId
        );
        if (firstPhoto) publicEvent.cover = applicationPreviewUrl(event.eventoId, firstPhoto.id);
      }
      return publicEvent;
    });
}

async function buscarEvento(eventoId) {
  return (await listarEventos()).find((event) => event.eventoId === eventoId) || null;
}

async function listarFotosEvento(eventoId) {
  return (await rows('Fotos'))
    .map(fotoFromRow)
    .filter((foto) => foto.eventoId === eventoId && foto.status === 'Processada')
    .map((foto) => {
      const preview = {
        ...foto,
        previewUrl: applicationPreviewUrl(foto.eventoId, foto.id),
        thumbnailUrl: applicationPreviewUrl(foto.eventoId, foto.id),
      };
      delete preview.originalFileId;
      delete preview.previewFileId;
      return preview;
    });
}

async function buscarPreviewFoto(eventoId, fotoId) {
  const photo = (await rows('Fotos'))
    .map(fotoFromRow)
    .find((foto) => foto.eventoId === eventoId && foto.id === fotoId && foto.status === 'Processada');
  if (!photo || !photo.previewFileId) return null;
  return { previewFileId: photo.previewFileId };
}

async function listarFotos() {
  const events = await listarEventosPublicados();
  const visible = new Set(events.filter((event) => event.visibility === 'publica').map((event) => event.eventoId));
  const photos = (await rows('Fotos')).map(fotoFromRow);
  return photos
    .filter((foto) => visible.has(foto.eventoId) && foto.status === 'Processada' && foto.availableForSale)
    .map((foto) => {
      const preview = { ...foto, url: applicationPreviewUrl(foto.eventoId, foto.id) };
      delete preview.previewUrl;
      delete preview.previewFileId;
      delete preview.originalFileId;
      return preview;
    });
}

async function buscarFotosParaCompra(fotoIds) {
  const selected = new Set(fotoIds);
  const photoRows = (await rows('Fotos')).map(fotoFromRow).filter((foto) => selected.has(foto.id));
  const events = await listarEventos();
  const eventMap = new Map(events.map((event) => [event.eventoId, event]));
  return photoRows.map((foto) => ({ foto, evento: eventMap.get(foto.eventoId) }));
}

async function listarRegrasPagamento() {
  return (await rows('RegrasPagamento'))
    .filter((row) => yes(row.get('Ativo')))
    .map((row) => ({
      method: row.get('MeioPagamento'),
      percentage: Number(row.get('PercentualEstimado') || 0),
      fixed: Number(row.get('ValorFixo') || 0),
      activeFrom: row.get('Vigencia') || '',
    }));
}

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
    ExpiraEm: new Date(record.exp).toISOString(),
    UsosMaximos: record.maxUses,
    Usos: 0,
    CriadoEm: new Date().toISOString(),
  })));
}

async function consumirDownload(downloadId, tokenHash) {
  const downloadRows = await rows('Downloads');
  const row = downloadRows.find((item) => item.get('DownloadID') === downloadId);
  if (!row || row.get('TokenHash') !== tokenHash) return null;
  if (Date.now() > new Date(row.get('ExpiraEm')).getTime()) return null;
  const uses = Number(row.get('Usos') || 0);
  const maxUses = Number(row.get('UsosMaximos') || 1);
  if (uses >= maxUses) return null;
  row.set('Usos', uses + 1);
  row.set('UltimoUsoEm', new Date().toISOString());
  await row.save();
  return { originalFileId: row.get('OriginalFileID'), fotoId: row.get('FotoID') };
}

function novoPedidoId() {
  return `PED_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = {
  driveUrlToThumbnail, applicationPreviewUrl, listarFotos, listarEventos, listarEventosPublicados,
  buscarEvento, listarFotosEvento, buscarPreviewFoto, buscarFotosParaCompra, listarRegrasPagamento,
  registrarPedido, buscarPedidoById, buscarPedidoByPreferenceOrPayment,
  atualizarPedidoPagamento, registrarEntrega, registrarWebhookSeNovo, finalizarWebhook,
  listarItensPedido, buscarOriginaisPedido, criarAutorizacoesDownload,
  consumirDownload, novoPedidoId,
};
