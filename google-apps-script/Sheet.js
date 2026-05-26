// Sheet.js - Spreadsheet model and light-weight administrative controls.
// The Eventos sheet is the source of truth for publication, access and sales.

var EVENTOS_HEADERS = [
  'EventoID', 'NomePasta', 'FolderID', 'Titulo', 'Categoria', 'DataEvento', 'HorarioEvento',
  'StatusProcessamento', 'Visibilidade', 'VendaAutorizada', 'Publicacao',
  'ProtecaoMenores', 'CodigoHash', 'CodigoVersao', 'CodigoGeradoEm',
  'CodigoRevogadoEm', 'TotalFotos', 'FotosProcessadas', 'FotosEntregues',
  'DataCriacao', 'DataInicio', 'DataConclusao', 'DataPublicacao', 'Erros',
  'PastaRemovida',
];

var FOTOS_HEADERS = [
  'FotoID', 'EventoID', 'OriginalFileID', 'PreviewFileID',
  'ThumbnailFileID', 'ThumbnailStatus', 'ThumbnailGeradaEm',
  'TipoFoto', 'StatusProcessamento', 'DisponivelVenda', 'PrecoUnitario',
  'DataProcessamento',
];

var PEDIDOS_HEADERS = [
  'PedidoID', 'PreferenceID', 'PaymentID', 'Status', 'Nome', 'Email',
  'WhatsApp', 'MeioPagamento', 'Subtotal', 'TaxaServico', 'TaxaComodidade',
  'CustoPagamentoEstimado', 'Total', 'TarifaReal', 'DataCriacao',
  'DataPagamento', 'EmailEnviadoEm', 'EmailStatus', 'EmailErro',
  'EmailUltimaTentativaEm', 'WhatsAppLink',
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

var ABAS_COMERCIAIS = [
  ['Eventos', EVENTOS_HEADERS],
  ['Fotos', FOTOS_HEADERS],
  ['Pedidos', PEDIDOS_HEADERS],
  ['ItensPedido', ITENS_HEADERS],
  ['Webhooks', WEBHOOK_HEADERS],
  ['Downloads', DOWNLOAD_HEADERS],
  ['RegrasPagamento', REGRAS_HEADERS],
];

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

function notificarAdministracao(message) {
  Logger.log(message);
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (error) {
    // Standalone Apps Script projects do not have spreadsheet UI access.
  }
}

function invalidarCacheSite(eventoId, scopes) {
  var backendUrl = getConfig('BACKEND_URL');
  var secret = getConfig('CACHE_INVALIDATION_SECRET');
  if (!backendUrl || !secret) {
    Logger.log('Cache nao invalidado: configure BACKEND_URL e CACHE_INVALIDATION_SECRET.');
    return false;
  }
  try {
    var response = UrlFetchApp.fetch(backendUrl + '/api/admin/cache/invalidate', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-cache-invalidation-secret': secret },
      payload: JSON.stringify({ eventoId: eventoId, scopes: scopes || ['catalogo', 'evento', 'media'] }),
      muteHttpExceptions: true,
    });
    var ok = response.getResponseCode() === 204;
    if (!ok) Logger.log('Falha ao invalidar cache (' + response.getResponseCode() + '): ' + response.getContentText());
    return ok;
  } catch (error) {
    Logger.log('Falha ao chamar invalidacao de cache: ' + error.message);
    return false;
  }
}

function inicializarEstrutura() {
  ABAS_COMERCIAIS.forEach(function(definition) {
    ensureSheet(definition[0], definition[1]);
  });
  aplicarValidacoesAdministrativas();
  notificarAdministracao(
    'Estrutura preparada com opcoes de preenchimento. Revise eventos antigos antes de publica-los ou autorizar vendas.'
  );
}

function reiniciarDadosParaEstreia() {
  if (getConfig('CONFIRMAR_RESET_INICIAL') !== 'APAGAR_DADOS_DE_TESTE') {
    throw new Error(
      'Reset bloqueado. Defina CONFIRMAR_RESET_INICIAL=APAGAR_DADOS_DE_TESTE nas propriedades do script e execute novamente.'
    );
  }
  var ss = getSpreadsheet();
  ABAS_COMERCIAIS.forEach(function(definition) {
    var sheet = ss.getSheetByName(definition[0]) || ss.insertSheet(definition[0]);
    sheet.clear();
    sheet.getRange(1, 1, 1, definition[1].length).setValues([definition[1]]);
    if (sheet.setFrozenRows) sheet.setFrozenRows(1);
  });
  aplicarValidacoesAdministrativas();
  PropertiesService.getScriptProperties().deleteProperty('CONFIRMAR_RESET_INICIAL');
  notificarAdministracao(
    'Dados de teste removidos das abas comerciais. Arquivos ja gerados no Drive nao foram apagados.'
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

function limparValidacoesAntigas(sheet) {
  if (!sheet.getMaxRows) return;
  var headers = headersMap(sheet).headers;
  if (!headers.length) return;
  var rows = Math.max(sheet.getMaxRows() - 1, 1);
  var range = sheet.getRange(2, 1, rows, headers.length);
  if (range.clearDataValidations) range.clearDataValidations();
}

function aplicarValidacoesAdministrativas() {
  ABAS_COMERCIAIS.forEach(function(definition) {
    limparValidacoesAntigas(ensureSheet(definition[0], definition[1]));
  });
  var eventos = getEventosSheet();
  // Column additions can leave an old list rule attached to a date/status cell.
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
    HorarioEvento: eventData.horarioEvento || '',
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
    ThumbnailFileID: dados.thumbnailFileId || '',
    ThumbnailStatus: dados.thumbnailFileId ? 'Processada' : 'Pendente',
    ThumbnailGeradaEm: dados.thumbnailFileId ? new Date().toISOString() : '',
    TipoFoto: dados.tipoFoto === 'capa' ? 'capa' : 'foto',
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
  var tipoFotoCol = headers.indexOf('TipoFoto');
  var disponibilidadeCol = headers.indexOf('DisponivelVenda');
  if (eventoCol < 0 || disponibilidadeCol < 0) return false;
  var changed = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][eventoCol] === eventoId) {
      var ehCapa = tipoFotoCol >= 0 && data[i][tipoFotoCol] === 'capa';
      var nextValue = ehCapa ? 'NAO' : value;
      if (data[i][disponibilidadeCol] !== nextValue) {
        sheet.getRange(i + 1, disponibilidadeCol + 1).setValue(nextValue);
        changed = true;
      }
    }
  }
  return changed;
}

function atualizarDerivadosFoto(fotoId, previewFileId, thumbnailFileId) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var idCol = headers.indexOf('FotoID');
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === fotoId) {
      setField(sheet, i + 1, 'PreviewFileID', previewFileId);
      setField(sheet, i + 1, 'ThumbnailFileID', thumbnailFileId);
      setField(sheet, i + 1, 'ThumbnailStatus', 'Processada');
      setField(sheet, i + 1, 'ThumbnailGeradaEm', new Date().toISOString());
      return true;
    }
  }
  return false;
}

function listarFotosParaReprocessar(limite) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var output = [];
  for (var i = 1; i < data.length && output.length < (limite || 5); i++) {
    var item = rowToObject(headers, data[i]);
    if (item.FotoID && item.PreviewFileID && !item.ThumbnailFileID && item.StatusProcessamento === 'Processada') {
      output.push(item);
    }
  }
  return output;
}

function listarFotosComMiniatura() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var output = [];
  for (var i = 1; i < data.length; i++) {
    var item = rowToObject(headers, data[i]);
    if (item.FotoID && item.ThumbnailFileID) output.push(item);
  }
  return output;
}

/**
 * Cadastra tarifas publicadas pelo Mercado Pago para Checkout online D0.
 * A tabela publica nao discrimina o debito virtual no Checkout Pro; por
 * seguranca financeira, ele usa a tarifa conservadora do credito 1x D0.
 * Confirme no painel da conta caso existam condicoes comerciais personalizadas.
 */
function cadastrarRegrasMercadoPagoD0() {
  var sheet = ensureSheet('RegrasPagamento', REGRAS_HEADERS);
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var regras = [
    { MeioPagamento: 'pix', PercentualEstimado: 0.99, ValorFixo: 0, Vigencia: 'Tabela Mercado Pago 03/11/2025 - Checkout D0', Ativo: 'SIM' },
    { MeioPagamento: 'credit_card', PercentualEstimado: 4.98, ValorFixo: 0, Vigencia: 'Tabela Mercado Pago 03/11/2025 - Checkout D0 1x', Ativo: 'SIM' },
    { MeioPagamento: 'debit_card', PercentualEstimado: 4.98, ValorFixo: 0, Vigencia: 'Estimativa conservadora - credito 1x D0 ate confirmar debito virtual no painel', Ativo: 'SIM' },
  ];
  regras.forEach(function(regra) {
    var rowNumber = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('MeioPagamento')] === regra.MeioPagamento) {
        rowNumber = i + 1;
        break;
      }
    }
    if (rowNumber < 0) {
      appendMappedRow(sheet, regra);
    } else {
      Object.keys(regra).forEach(function(field) {
        setField(sheet, rowNumber, field, regra[field]);
      });
    }
  });
  aplicarValidacoesAdministrativas();
  notificarAdministracao('Taxas D0 cadastradas: Pix 0,99%, credito 1x 4,98% e debito virtual estimado conservadoramente em 4,98% ate confirmacao no painel Mercado Pago.');
}

function normalizarMetadadosEventos() {
  var sheet = getEventosSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var atualizados = 0;
  for (var i = 1; i < data.length; i++) {
    var item = rowToObject(headers, data[i]);
    if (!item.EventoID || !item.NomePasta) continue;
    var metadados = interpretarNomePasta(item.NomePasta);
    if (metadados.nomeNormalizado !== item.NomePasta) {
      setField(sheet, i + 1, 'NomePasta', metadados.nomeNormalizado);
      atualizados += 1;
    }
    if (metadados.valido) {
      setField(sheet, i + 1, 'Titulo', metadados.titulo);
      setField(sheet, i + 1, 'Categoria', metadados.categoria);
      setField(sheet, i + 1, 'DataEvento', metadados.dataEvento);
    }
  }
  notificarAdministracao(atualizados + ' evento(s) com nome operacional normalizado(s).');
}

function eventoProntoParaRemover(eventoId) {
  var ev = getStatusEvento(eventoId);
  return !!ev && !ev.pastaRemovida && ev.totalFotos > 0 &&
    ev.fotosProcessadas >= ev.totalFotos;
}

function getEventoSelecionado() {
  var sheet = getEventosSheet();
  try {
    var active = sheet.getActiveRange();
    var row = active && active.getRow();
    if (row && row > 1) {
      var data = sheet.getDataRange().getValues();
      return { sheet: sheet, rowNumber: row, item: rowToObject(data[0], data[row - 1]) };
    }
  } catch (error) {
    // A selection exists only when the script is bound to the spreadsheet.
  }
  var configuredId = getConfig('ADMIN_EVENTO_ID');
  if (configuredId) {
    var configuredEvent = findEventoRow(configuredId);
    if (configuredEvent) return configuredEvent;
    throw new Error('ADMIN_EVENTO_ID nao corresponde a um EventoID existente.');
  }
  throw new Error(
    'Em script independente, defina ADMIN_EVENTO_ID nas propriedades do script para executar esta acao.'
  );
}

function publicarEventoSelecionado() {
  var selected = getEventoSelecionado();
  if (!selected.item.Categoria || !selected.item.DataEvento) {
    throw new Error('Informe Categoria e DataEvento antes de publicar.');
  }
  setField(selected.sheet, selected.rowNumber, 'Publicacao', 'publicado');
  setField(selected.sheet, selected.rowNumber, 'DataPublicacao', new Date().toISOString());
  invalidarCacheSite(selected.item.EventoID);
}

function autorizarVendaSelecionada() {
  var selected = getEventoSelecionado();
  if (selected.item.ProtecaoMenores === 'SIM' && selected.item.Visibilidade !== 'protegida') {
    throw new Error('Evento com menores deve permanecer protegido.');
  }
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', 'SIM');
  atualizarDisponibilidadeFotos(selected.item.EventoID, 'SIM');
  invalidarCacheSite(selected.item.EventoID);
}

function revogarVendaSelecionada() {
  var selected = getEventoSelecionado();
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', 'NAO');
  atualizarDisponibilidadeFotos(selected.item.EventoID, 'NAO');
  invalidarCacheSite(selected.item.EventoID);
}

function sincronizarVendaSelecionada() {
  var selected = getEventoSelecionado();
  var value = String(selected.item.VendaAutorizada || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO';
  if (value === 'SIM' && selected.item.ProtecaoMenores === 'SIM' && selected.item.Visibilidade !== 'protegida') {
    throw new Error('Evento com menores deve permanecer protegido antes de liberar venda.');
  }
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', value);
  atualizarDisponibilidadeFotos(selected.item.EventoID, value);
  invalidarCacheSite(selected.item.EventoID);
  notificarAdministracao('Fotos sincronizadas com VendaAutorizada=' + value + '.');
}

function sincronizarConfiguracoesAdministrativas() {
  var sheet = getEventosSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var props = PropertiesService.getScriptProperties();
  for (var i = 1; i < data.length; i++) {
    var item = rowToObject(headers, data[i]);
    if (!item.EventoID) continue;
    var venda = String(item.VendaAutorizada || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO';
    if (venda === 'SIM' && item.ProtecaoMenores === 'SIM' && item.Visibilidade !== 'protegida') {
      setField(sheet, i + 1, 'VendaAutorizada', 'NAO');
      atualizarDisponibilidadeFotos(item.EventoID, 'NAO');
      Logger.log('Venda bloqueada para evento com menores em galeria nao protegida: ' + item.EventoID);
      item.VendaAutorizada = 'NAO';
      venda = 'NAO';
    }
    atualizarDisponibilidadeFotos(item.EventoID, venda);
    var fingerprint = [item.Publicacao, item.Visibilidade, item.VendaAutorizada, item.ProtecaoMenores, item.CodigoVersao].join('|');
    var key = 'CACHE_CONFIG_' + item.EventoID;
    if (props.getProperty(key) !== fingerprint) {
      invalidarCacheSite(item.EventoID);
      if (props.setProperty) props.setProperty(key, fingerprint);
    }
  }
  Logger.log('Disponibilidade de fotos sincronizada com as configuracoes dos eventos.');
}

function alternarVisibilidadeSelecionada() {
  var selected = getEventoSelecionado();
  var atual = selected.item.Visibilidade || 'protegida';
  var nova = atual === 'publica' ? 'protegida' : 'publica';
  if (nova === 'publica' && selected.item.ProtecaoMenores === 'SIM') {
    throw new Error('Evento com menores nao pode ser publico.');
  }
  setField(selected.sheet, selected.rowNumber, 'Visibilidade', nova);
  invalidarCacheSite(selected.item.EventoID);
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
  invalidarCacheSite(selected.item.EventoID);
  notificarAdministracao('Codigo de acesso (anote agora): ' + codigo);
}

function revogarCodigoEventoSelecionado() {
  var selected = getEventoSelecionado();
  var versao = (parseInt(selected.item.CodigoVersao, 10) || 0) + 1;
  setField(selected.sheet, selected.rowNumber, 'CodigoHash', '');
  setField(selected.sheet, selected.rowNumber, 'CodigoVersao', versao);
  setField(selected.sheet, selected.rowNumber, 'CodigoRevogadoEm', new Date().toISOString());
  invalidarCacheSite(selected.item.EventoID);
}

function arquivarEventoSelecionado() {
  var selected = getEventoSelecionado();
  setField(selected.sheet, selected.rowNumber, 'Publicacao', 'arquivado');
  setField(selected.sheet, selected.rowNumber, 'VendaAutorizada', 'NAO');
  atualizarDisponibilidadeFotos(selected.item.EventoID, 'NAO');
  invalidarCacheSite(selected.item.EventoID);
}

if (typeof module !== 'undefined') {
  module.exports = {
    getSheet: getSheet, getEventosSheet: getEventosSheet, registrarFoto: registrarFoto,
    registrarEvento: registrarEvento, atualizarStatusEvento: atualizarStatusEvento,
    getStatusEvento: getStatusEvento, getStatusEventoByFolderId: getStatusEventoByFolderId,
    eventoProntoParaRemover: eventoProntoParaRemover, inicializarEstrutura: inicializarEstrutura,
    reiniciarDadosParaEstreia: reiniciarDadosParaEstreia,
    atualizarDisponibilidadeFotos: atualizarDisponibilidadeFotos,
    atualizarDerivadosFoto: atualizarDerivadosFoto,
    listarFotosParaReprocessar: listarFotosParaReprocessar,
    listarFotosComMiniatura: listarFotosComMiniatura,
    invalidarCacheSite: invalidarCacheSite,
    publicarEventoSelecionado: publicarEventoSelecionado,
    autorizarVendaSelecionada: autorizarVendaSelecionada,
    revogarVendaSelecionada: revogarVendaSelecionada,
    sincronizarVendaSelecionada: sincronizarVendaSelecionada,
    sincronizarConfiguracoesAdministrativas: sincronizarConfiguracoesAdministrativas,
    alternarVisibilidadeSelecionada: alternarVisibilidadeSelecionada,
    gerarCodigoEventoSelecionado: gerarCodigoEventoSelecionado,
    revogarCodigoEventoSelecionado: revogarCodigoEventoSelecionado,
    arquivarEventoSelecionado: arquivarEventoSelecionado,
    aplicarValidacoesAdministrativas: aplicarValidacoesAdministrativas,
    cadastrarRegrasMercadoPagoD0: cadastrarRegrasMercadoPagoD0,
    normalizarMetadadosEventos: normalizarMetadadosEventos,
    codigoHash: codigoHash, COL: COL,
  };
}
