const {
  applicationPreviewUrl, dateLabel, displayTitle, eventoFromRow, fotoFromRow, rows,
} = require('./google-sheets.shared');
const { appendMediaToken, issueMediaToken } = require('./media-token');
const { acoesDisponiveis, avisosEvento, etapaEvento } = require('./event-rules');
const { classificarEntrega, resumirProblemas } = require('./delivery-health');

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
    emailSentAt: row.get('EmailEnviadoEm') || '',
    emailAttemptedAt: row.get('EmailUltimaTentativaEm') || '',
    deliveryAttempts: Number(row.get('EntregaTentativas') || 0),
    deliveryNextAt: row.get('EntregaProximaEm') || '',
    whatsappLink: row.get('WhatsAppLink') || '',
  };
}

/**
 * Pedidos que precisam de alguem: pago sem link, e-mail que nao saiu, valor divergente e
 * pendente antigo. A regra e a mesma da conciliacao automatica (lib/delivery-health.js).
 */
function pedidosComProblema(pedidos, comDownload, agora = Date.now()) {
  return pedidos
    .map((pedido) => {
      const { problema } = classificarEntrega(pedido, { agora, temDownload: comDownload.has(pedido.id) });
      return problema ? { ...problema, pedidoId: pedido.id, status: pedido.status, email: pedido.email, total: pedido.total, createdAt: pedido.createdAt } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.severidade === b.severidade
      ? String(a.createdAt).localeCompare(String(b.createdAt))
      : (a.severidade === 'erro' ? -1 : 1)));
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
  const comDownload = new Set(downloadRows.map((row) => row.get('PedidoID')));
  const atencao = pedidosComProblema(pedidos, comDownload);
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
    deliveryIssues: atencao.filter((item) => item.severidade === 'erro').length,
    atencao: atencao.slice(0, 20),
    resumoAtencao: resumirProblemas(atencao),
  };
}

async function listarPedidosPascom({ status = '', q = '', dataInicio = '', dataFim = '', limit = 100, atencao = '' } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  const max = Math.min(Number(limit) || 100, 200);
  const somenteAtencao = atencao === 'true' || atencao === true;
  const [pedidoRows, downloadRows] = await Promise.all([
    rows('Pedidos'),
    somenteAtencao ? rows('Downloads') : Promise.resolve([]),
  ]);
  const comProblema = somenteAtencao
    ? new Set(pedidosComProblema(pedidoRows.map(pedidoFromRow), new Set(downloadRows.map((row) => row.get('PedidoID'))))
      .map((item) => item.pedidoId))
    : null;
  const pedidos = pedidoRows.map(pedidoFromRow).filter((pedido) => {
    if (comProblema && !comProblema.has(pedido.id)) return false;
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

// ─── Gestao de eventos ────────────────────────────────────────────────────────

function adminMediaUrl(eventoId, fotoId, variant) {
  const token = issueMediaToken({ eventoId, fotoId, variant, admin: true });
  return appendMediaToken(applicationPreviewUrl(eventoId, fotoId, variant), token);
}

function estatisticasPorEvento(fotoRows, itemRows, pedidoRows) {
  const pagos = new Set(pedidoRows
    .filter((row) => row.get('Status') === 'Pagamento Confirmado')
    .map((row) => row.get('PedidoID')));
  const stats = new Map();
  const of = (eventoId) => {
    if (!stats.has(eventoId)) stats.set(eventoId, { processadas: 0, cover: null, firstPhoto: null, vendas: 0, receita: 0 });
    return stats.get(eventoId);
  };
  fotoRows.map(fotoFromRow).forEach((foto) => {
    if (foto.status !== 'Processada' || !foto.previewFileId) return;
    const entry = of(foto.eventoId);
    if (foto.type === 'capa') entry.cover = entry.cover || foto;
    else {
      entry.processadas += 1;
      entry.firstPhoto = entry.firstPhoto || foto;
    }
  });
  itemRows.forEach((row) => {
    if (!pagos.has(row.get('PedidoID'))) return;
    const entry = of(row.get('EventoID') || '');
    entry.vendas += 1;
    entry.receita += numberValue(row.get('PrecoUnitario'));
  });
  return stats;
}

/** Lista de falhas legivel: Erros guarda JSON (processamento em fatias) ou texto (versoes antigas). */
function falhasDoEvento(texto) {
  const bruto = String(texto || '').trim();
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto);
    if (Array.isArray(lista)) return lista.map((item) => String(item).slice(0, 240)).slice(-20);
  } catch (_error) {
    // texto simples
  }
  return [bruto.slice(0, 240)];
}

/** Ultimo pedido de processamento de cada evento (PedidosProcessamento): pendente ou com erro. */
function pedidosPorEvento(pedidoRows) {
  const ultimo = new Map();
  pedidoRows.forEach((row) => {
    const eventoId = row.get('EventoID');
    if (eventoId) ultimo.set(eventoId, row);
  });
  const resultado = new Map();
  ultimo.forEach((row, eventoId) => {
    const status = row.get('Status');
    resultado.set(eventoId, {
      pendente: status === 'pendente' || status === 'executando'
        ? { tipo: row.get('Tipo') || '', desde: row.get('Quando') || '', alvo: row.get('Alvo') || '' }
        : null,
      erro: status === 'erro' ? String(row.get('Detalhe') || 'Falha no processamento.').slice(0, 240) : '',
    });
  });
  return resultado;
}

function eventoPascomFromRow(row, stats, pedidos = new Map()) {
  const base = eventoFromRow(row);
  const entry = stats.get(base.eventoId) || { processadas: 0, vendas: 0, receita: 0 };
  const espacoLiberacao = String(row.get('EspacoLiberacao') || '');
  const thumb = espacoLiberacao ? null : entry.cover || entry.firstPhoto;
  const evento = {
    id: base.eventoId,
    eventoId: base.eventoId,
    title: base.title,
    nomePasta: base.nomePasta,
    category: base.category,
    date: base.date,
    dateLabel: base.dateLabel,
    time: base.time,
    slug: base.slug,
    visibility: base.visibility,
    salesAuthorized: base.salesAuthorized,
    publication: base.publication,
    minorProtection: base.minorProtection,
    hasCode: Boolean(base.codeHash),
    status: base.status,
    erro: String(row.get('Erros') || '').slice(0, 240),
    totalFotos: base.totalFotos,
    fotosProcessadas: entry.processadas,
    hasCover: Boolean(entry.cover),
    coverThumbnail: thumb ? adminMediaUrl(base.eventoId, thumb.id, 'thumbnail') : '',
    vendas: entry.vendas,
    receita: entry.receita,
    criadoEm: base.dataCriacao,
    espacoLiberacao,
    espacoLiberadoBytes: numberValue(row.get('EspacoLiberadoBytes')),
    progresso: numberValue(row.get('FotosProcessadas')),
    falhas: base.status === 'Erro' ? falhasDoEvento(row.get('Erros')) : [],
    pedidoPendente: pedidos.get(base.eventoId)?.pendente || null,
    pedidoErro: pedidos.get(base.eventoId)?.erro || '',
  };
  evento.restantes = Math.max(evento.totalFotos - evento.progresso, 0);
  return { ...evento, etapa: etapaEvento(evento), acoes: acoesDisponiveis(evento), avisos: avisosEvento(evento) };
}

/** Envios finalizados no painel que o trigger ainda nao transformou em linha de Eventos. */
function enviosNaFila(envioRows, nomesRegistrados) {
  const ultimoPorEnvio = new Map();
  envioRows.forEach((row) => {
    const uploadId = row.get('UploadID') || '';
    if (uploadId) ultimoPorEnvio.set(uploadId, row);
  });
  return [...ultimoPorEnvio.values()]
    .filter((row) => row.get('Status') === 'finalizado' && !nomesRegistrados.has(row.get('NomePasta')))
    .map((row) => {
      const nomePasta = row.get('NomePasta') || '';
      const [category = '', date = ''] = nomePasta.split('__');
      const evento = {
        id: `fila-${row.get('UploadID')}`,
        eventoId: '',
        fila: true,
        title: displayTitle(nomePasta.split('__').slice(2).join(' ').replace(/-/g, ' ')) || nomePasta,
        nomePasta,
        category,
        date,
        dateLabel: dateLabel(date),
        status: 'Na fila',
        totalFotos: numberValue(row.get('Arquivos')),
        fotosProcessadas: 0,
        vendas: 0,
        receita: 0,
        criadoEm: row.get('Quando') || '',
      };
      return { ...evento, etapa: etapaEvento(evento), acoes: {}, avisos: [] };
    });
}

async function listarEventosPascom() {
  const [eventoRows, fotoRows, itemRows, pedidoRows, envioRows, processamentoRows] = await Promise.all([
    rows('Eventos'),
    rows('Fotos'),
    rows('ItensPedido'),
    rows('Pedidos'),
    rows('EnviosPascom'),
    rows('PedidosProcessamento'),
  ]);
  const stats = estatisticasPorEvento(fotoRows, itemRows, pedidoRows);
  const pedidos = pedidosPorEvento(processamentoRows);
  const eventos = eventoRows.filter((row) => row.get('EventoID')).map((row) => eventoPascomFromRow(row, stats, pedidos));
  const fila = enviosNaFila(envioRows, new Set(eventos.map((evento) => evento.nomePasta)));
  const recentes = (a, b) => String(b.criadoEm || b.date).localeCompare(String(a.criadoEm || a.date));
  return [...fila.sort(recentes), ...eventos.sort(recentes)];
}

async function detalharEventoPascom(eventoId) {
  const [eventoRows, fotoRows, itemRows, pedidoRows, processamentoRows] = await Promise.all([
    rows('Eventos'),
    rows('Fotos'),
    rows('ItensPedido'),
    rows('Pedidos'),
    rows('PedidosProcessamento'),
  ]);
  const row = eventoRows.find((candidate) => candidate.get('EventoID') === eventoId);
  if (!row) return null;
  const stats = estatisticasPorEvento(
    fotoRows.filter((candidate) => candidate.get('EventoID') === eventoId),
    itemRows.filter((candidate) => candidate.get('EventoID') === eventoId),
    pedidoRows,
  );
  // Fotos com espaco liberado nao tem mais previa no Drive.
  const fotos = fotoRows
    .filter((candidate) => candidate.get('ArquivosLiberados') !== 'SIM')
    .map(fotoFromRow)
    .filter((foto) => foto.eventoId === eventoId && foto.status === 'Processada' && foto.previewFileId)
    .sort((a, b) => (a.type === 'capa' ? -1 : 0) - (b.type === 'capa' ? -1 : 0))
    .map((foto) => ({
      id: foto.id,
      type: foto.type,
      thumbnailUrl: adminMediaUrl(eventoId, foto.id, 'thumbnail'),
      previewUrl: adminMediaUrl(eventoId, foto.id, 'preview'),
    }));
  return { evento: eventoPascomFromRow(row, stats, pedidosPorEvento(processamentoRows)), fotos };
}

module.exports = {
  pedidosComProblema,
  dashboardPascom,
  detalharEventoPascom,
  detalharPedidoPascom,
  listarEventosPascom,
  listarPedidosPascom,
  pedidoFromRow,
};
