// Sheet.js - Spreadsheet model and light-weight administrative controls.
// The Eventos sheet is the source of truth for publication, access and sales.

var EVENTOS_HEADERS = [
  'EventoID', 'NomePasta', 'FolderID', 'Titulo', 'Categoria', 'DataEvento',
  'StatusProcessamento', 'Visibilidade', 'VendaAutorizada', 'Publicacao',
  'ProtecaoMenores', 'CodigoHash', 'CodigoVersao', 'CodigoGeradoEm',
  'CodigoRevogadoEm', 'TotalFotos', 'FotosProcessadas', 'FotosEntregues',
  'DataCriacao', 'DataInicio', 'DataConclusao', 'DataPublicacao', 'Erros',
  'PastaRemovida',
];

var FOTOS_HEADERS = [
  'FotoID', 'EventoID', 'OriginalFileID', 'PreviewFileID',
  'StatusProcessamento', 'DisponivelVenda', 'PrecoUnitario',
  'DataProcessamento',
];

var PEDIDOS_HEADERS = [
  'PedidoID', 'PreferenceID', 'PaymentID', 'Status', 'Nome', 'Email',
  'WhatsApp', 'MeioPagamento', 'Subtotal', 'TaxaServico', 'TaxaComodidade',
  'CustoPagamentoEstimado', 'Total', 'TarifaReal', 'DataCriacao',
  'DataPagamento', 'EmailEnviadoEm', 'WhatsAppLink',
];

var ITENS_HEADERS = ['PedidoID', 'FotoID', 'EventoID', 'PrecoUnitario'];
var WEBHOOK_HEADERS = ['ChaveEvento', 'PaymentID', 'Tipo', 'RecebidoEm', 'ProcessadoEm', 'Status'];
var DOWNLOAD_HEADERS = [
  'DownloadID', 'PedidoID', 'FotoID', 'OriginalFileID', 'TokenHash',
  'ExpiraEm', 'UsosMaximos', 'Usos', 'CriadoEm', 'UltimoUsoEm',
];
var REGRAS_HEADERS = ['MeioPagamento', 'PercentualEstimado', 'ValorFixo', 'Vigencia', 'Ativo'];

var EVENTO_OPCOES = {
  Categoria: [
    'celebracoes', 'batismo', 'eucaristia', 'crisma',
    'casamento', 'uncao-dos-enfermos', 'ordem',
  ],
  Visibilidade: ['publica', 'protegida'],
  VendaAutorizada: ['SIM', 'NAO'],
  Publicacao: ['rascunho', 'publicado', 'arquivado'],
  ProtecaoMenores: ['SIM', 'NAO'],
};

var REGRA_PAGAMENTO_OPCOES = {
  MeioPagamento: ['pix', 'debit_card', 'credit_card'],
  Ativo: ['SIM', 'NAO'],
};

var COL = {
  ID: 1, EVENTO: 2, LINK_ORIGINAL: 3, LINK_AMOSTRA: 4, STATUS: 5,
  WHATSAPP: 6, TOTAL_PAGO: 7, ID_MERCADO_PAGO: 8, DATA_PROCESSAMENTO: 9,
  DATA_PAGAMENTO: 10, LINK_ENTREGA: 11, TENTATIVAS_ENTREGA: 12,
  PRECO: 13, EVENTO_ID: 14,
};

function getConfig(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
}

function ensureSheet(nome, headers) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    sheet.appendRow(headers);
      if (sheet.setFrozenRows) sheet.setFrozenRows(1);
    return sheet;
  }
  var range = sheet.getDataRange();
  var values = range.getValues();
  var existing = values.length ? values[0] : [];
  if (!existing.length) {
    sheet.appendRow(headers);
      if (sheet.setFrozenRows) sheet.setFrozenRows(1);
    return sheet;
  }
  headers.forEach(function(header) {
    if (existing.indexOf(header) === -1) {
      existing.push(header);
      sheet.getRange(1, existing.length).setValue(header);
    }
  });
    if (sheet.setFrozenRows) sheet.setFrozenRows(1);
  return sheet;
}

function headersMap(sheet) {
  var headers = sheet.getDataRange().getValues()[0] || [];
  var map = {};
  headers.forEach(function(header, index) { map[header] = index; });
  return { headers: headers, map: map };
}

function appendMappedRow(sheet, values) {
  var info = headersMap(sheet);
  sheet.appendRow(info.headers.map(function(header) {
    return values[header] !== undefined ? values[header] : '';
  }));
}

function setField(sheet, rowNumber, field, value) {
  var index = headersMap(sheet).map[field];
  if (index !== undefined) sheet.getRange(rowNumber, index + 1).setValue(value);
}

function rowToObject(headers, row) {
  var object = {};
  headers.forEach(function(header, index) { object[header] = row[index]; });
  return object;
}

function inicializarEstrutura() {
  ensureSheet('Eventos', EVENTOS_HEADERS);
  ensureSheet('Fotos', FOTOS_HEADERS);
  ensureSheet('Pedidos', PEDIDOS_HEADERS);
  ensureSheet('ItensPedido', ITENS_HEADERS);
  ensureSheet('Webhooks', WEBHOOK_HEADERS);
  ensureSheet('Downloads', DOWNLOAD_HEADERS);
  ensureSheet('RegrasPagamento', REGRAS_HEADERS);
  aplicarValidacoesAdministrativas();
  SpreadsheetApp.getUi().alert(
    'Estrutura preparada com opcoes de preenchimento. Revise eventos antigos antes de publica-los ou autorizar vendas.'
  );
}

function getSheet() {
  return ensureSheet('Fotos', FOTOS_HEADERS);
}

function getEventosSheet() {
  return ensureSheet('Eventos', EVENTOS_HEADERS);
}

function aplicarValidacaoLista(sheet, field, options) {
  if (!SpreadsheetApp.newDataValidation || !sheet.getMaxRows) return;
  var column = headersMap(sheet).map[field];
  if (column === undefined) return;
  var rows = Math.max(sheet.getMaxRows() - 1, 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, column + 1, rows, 1).setDataValidation(rule);
}

function aplicarValidacoesAdministrativas() {
  var eventos = getEventosSheet();
  Object.keys(EVENTO_OPCOES).forEach(function(field) {
    aplicarValidacaoLista(eventos, field, EVENTO_OPCOES[field]);
  });
  var regras = ensureSheet('RegrasPagamento', REGRAS_HEADERS);
  Object.keys(REGRA_PAGAMENTO_OPCOES).forEach(function(field) {
    aplicarValidacaoLista(regras, field, REGRA_PAGAMENTO_OPCOES[field]);
  });
}

function registrarEvento(eventData) {
  var sheet = getEventosSheet();
  appendMappedRow(sheet, {
    EventoID: eventData.eventoId,
    NomePasta: eventData.nomePasta,
    FolderID: eventData.folderId,
    Titulo: eventData.titulo || eventData.nomePasta,
    Categoria: eventData.categoria || '',
    DataEvento: eventData.dataEvento || '',
    StatusProcessamento: 'Pendente',
    Visibilidade: 'protegida',
    VendaAutorizada: 'NAO',
    Publicacao: 'rascunho',
    ProtecaoMenores: 'NAO',
    TotalFotos: eventData.totalFotos || 0,
    FotosProcessadas: 0,
    FotosEntregues: 0,
    DataCriacao: new Date().toISOString(),
    Erros: eventData.erro || '',
    PastaRemovida: false,
  });
}

function findEventoRow(eventoId) {
  var sheet = getEventosSheet();
  var values = sheet.getDataRange().getValues();
  var headers = values[0] || [];
  for (var i = 1; i < values.length; i++) {
    var item = rowToObject(headers, values[i]);
    if (item.EventoID === eventoId) return { sheet: sheet, rowNumber: i + 1, item: item };
  }
  return null;
}

function atualizarStatusEvento(eventoId, status, extra) {
  var found = findEventoRow(eventoId);
  if (!found) return false;
  setField(found.sheet, found.rowNumber, 'StatusProcessamento', status);
  // Preserve the legacy field if a deployed sheet already contains it.
  setField(found.sheet, found.rowNumber, 'Status', status);
  if (extra) {
    if (extra.fotosProcessadas !== undefined) setField(found.sheet, found.rowNumber, 'FotosProcessadas', extra.fotosProcessadas);
    if (extra.fotosEntregues !== undefined) setField(found.sheet, found.rowNumber, 'FotosEntregues', extra.fotosEntregues);
    if (extra.dataInicio) setField(found.sheet, found.rowNumber, 'DataInicio', extra.dataInicio);
    if (extra.dataConclusao) setField(found.sheet, found.rowNumber, 'DataConclusao', extra.dataConclusao);
    if (extra.erro) setField(found.sheet, found.rowNumber, 'Erros', extra.erro);
    if (extra.pastaRemovida !== undefined) setField(found.sheet, found.rowNumber, 'PastaRemovida', extra.pastaRemovida);
  }
  return true;
}

function getStatusEvento(eventoId) {
  var found = findEventoRow(eventoId);
  if (!found) return null;
  var item = found.item;
  return {
    eventoId: item.EventoID,
    nomePasta: item.NomePasta,
    folderId: item.FolderID,
    status: item.StatusProcessamento || item.Status,
    totalFotos: parseInt(item.TotalFotos, 10) || 0,
    fotosProcessadas: parseInt(item.FotosProcessadas, 10) || 0,
    fotosEntregues: parseInt(item.FotosEntregues, 10) || 0,
    dataInicio: item.DataInicio,
    pastaRemovida: item.PastaRemovida === true || item.PastaRemovida === 'TRUE',
  };
}

function getStatusEventoByFolderId(folderId) {
  var sheet = getEventosSheet();
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0] || [];
  for (var i = 1; i < rows.length; i++) {
    var item = rowToObject(headers, rows[i]);
    if (item.FolderID === folderId) {
      return { eventoId: item.EventoID, status: item.StatusProcessamento || item.Status };
    }
  }
  return null;
}

function registrarFoto(dados) {
  appendMappedRow(getSheet(), {
    FotoID: dados.id,
    EventoID: dados.eventoId || '',
    OriginalFileID: dados.originalFileId,
    PreviewFileID: dados.previewFileId,
    StatusProcessamento: 'Processada',
    DisponivelVenda: 'NAO',
    PrecoUnitario: dados.preco || 10,
    DataProcessamento: new Date().toISOString(),
    // Legacy fields are intentionally left without a public original URL.
    ID: dados.id,
    Evento: dados.evento || '',
    Link_Amostra: dados.linkAmostra || '',
    Status: 'Processada',
    Preco: dados.preco || 10,
  });
}

function atualizarDisponibilidadeFotos(eventoId, value) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var eventoCol = headers.indexOf('EventoID');
  var disponibilidadeCol = headers.indexOf('DisponivelVenda');
  if (eventoCol < 0 || disponibilidadeCol < 0) return;
  for (var i = 1; i < data.length; i++) {
    if (data[i][eventoCol] === eventoId) {
      sheet.getRange(i + 1, disponibilidadeCol + 1).setValue(value);
    }
  }
}

function eventoProntoParaRemover(eventoId) {
  var ev = getStatusEvento(eventoId);
  return !!ev && !ev.pastaRemovida && ev.totalFotos > 0 &&
    ev.fotosProcessadas >= ev.totalFotos;
}

function getEventoSelecionado() {
  var sheet = getEventosSheet();
  var active = sheet.getActiveRange();
  var row = active && active.getRow();
  if (!row || row <= 1) throw new Error('Selecione uma linha de evento.');
  var data = sheet.getDataRange().getValues();
  return { sheet: sheet, rowNumber: row, item: rowToObject(data[0], data[row - 1]) };
}

function publicarEventoSelecionado() {
  var selected = getEventoSelecionado();
  if (!selected.item.Categoria || !selected.item.DataEvento) {
    throw new Error('Informe Categoria e DataEvento antes de publicar.');
  }
  setField(selected.sheet, selected.rowNumber, 'Publicacao', 'publicado');
  setField(selected.sheet, selected.rowNumber, 'DataPublicacao', new Date().toISOString());
}

function autorizarVendaSelecionada() {
  var selected = getEventoSelecionado();
  if (selected.item.ProtecaoMenores === 'SIM' && selected.item.Visibilidade !== 'protegida') {
    throw new Error('Evento com menores deve permanecer protegido.');
  }
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', 'SIM');
  atualizarDisponibilidadeFotos(selected.item.EventoID, 'SIM');
}

function revogarVendaSelecionada() {
  var selected = getEventoSelecionado();
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', 'NAO');
  atualizarDisponibilidadeFotos(selected.item.EventoID, 'NAO');
}

function sincronizarVendaSelecionada() {
  var selected = getEventoSelecionado();
  var value = String(selected.item.VendaAutorizada || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO';
  if (value === 'SIM' && selected.item.ProtecaoMenores === 'SIM' && selected.item.Visibilidade !== 'protegida') {
    throw new Error('Evento com menores deve permanecer protegido antes de liberar venda.');
  }
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', value);
  atualizarDisponibilidadeFotos(selected.item.EventoID, value);
  SpreadsheetApp.getUi().alert('Fotos sincronizadas com VendaAutorizada=' + value + '.');
}

function alternarVisibilidadeSelecionada() {
  var selected = getEventoSelecionado();
  var atual = selected.item.Visibilidade || 'protegida';
  var nova = atual === 'publica' ? 'protegida' : 'publica';
  if (nova === 'publica' && selected.item.ProtecaoMenores === 'SIM') {
    throw new Error('Evento com menores nao pode ser publico.');
  }
  setField(selected.sheet, selected.rowNumber, 'Visibilidade', nova);
}

function codigoHash(codigo) {
  var salt = getConfig('GALLERY_CODE_SALT') || '';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, codigo + salt);
  return bytes.map(function(value) {
    var normalized = value < 0 ? value + 256 : value;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function gerarCodigoEventoSelecionado() {
  var selected = getEventoSelecionado();
  var codigo = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  var versao = (parseInt(selected.item.CodigoVersao, 10) || 0) + 1;
  setField(selected.sheet, selected.rowNumber, 'Visibilidade', 'protegida');
  setField(selected.sheet, selected.rowNumber, 'CodigoHash', codigoHash(codigo));
  setField(selected.sheet, selected.rowNumber, 'CodigoVersao', versao);
  setField(selected.sheet, selected.rowNumber, 'CodigoGeradoEm', new Date().toISOString());
  setField(selected.sheet, selected.rowNumber, 'CodigoRevogadoEm', '');
  SpreadsheetApp.getUi().alert('Codigo de acesso (anote agora): ' + codigo);
}

function revogarCodigoEventoSelecionado() {
  var selected = getEventoSelecionado();
  setField(selected.sheet, selected.rowNumber, 'CodigoHash', '');
  setField(selected.sheet, selected.rowNumber, 'CodigoRevogadoEm', new Date().toISOString());
}

function arquivarEventoSelecionado() {
  var selected = getEventoSelecionado();
  setField(selected.sheet, selected.rowNumber, 'Publicacao', 'arquivado');
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', 'NAO');
  atualizarDisponibilidadeFotos(selected.item.EventoID, 'NAO');
}

if (typeof module !== 'undefined') {
  module.exports = {
    getSheet: getSheet, getEventosSheet: getEventosSheet, registrarFoto: registrarFoto,
    registrarEvento: registrarEvento, atualizarStatusEvento: atualizarStatusEvento,
    getStatusEvento: getStatusEvento, getStatusEventoByFolderId: getStatusEventoByFolderId,
    eventoProntoParaRemover: eventoProntoParaRemover, inicializarEstrutura: inicializarEstrutura,
    atualizarDisponibilidadeFotos: atualizarDisponibilidadeFotos,
    publicarEventoSelecionado: publicarEventoSelecionado,
    autorizarVendaSelecionada: autorizarVendaSelecionada,
    revogarVendaSelecionada: revogarVendaSelecionada,
    sincronizarVendaSelecionada: sincronizarVendaSelecionada,
    alternarVisibilidadeSelecionada: alternarVisibilidadeSelecionada,
    gerarCodigoEventoSelecionado: gerarCodigoEventoSelecionado,
    revogarCodigoEventoSelecionado: revogarCodigoEventoSelecionado,
    arquivarEventoSelecionado: arquivarEventoSelecionado,
    aplicarValidacoesAdministrativas: aplicarValidacoesAdministrativas,
    codigoHash: codigoHash, COL: COL,
  };
}
