// Sistema.js — Diagnostico de producao e liberacao de espaco no Drive para o Painel Pascom.
// Chamado pelo Web App (doPost em Upload.js). O diagnostico devolve apenas presenca de
// configuracoes e contagens: nenhum valor de segredo sai daqui.
// Dependencias globais (Apps Script): DriveApp, ScriptApp, PropertiesService, CacheService,
// SpreadsheetApp, MailApp, Logger.

/* global DriveApp, ScriptApp, PropertiesService, CacheService, SpreadsheetApp, MailApp, Logger,
   armazenamentoDrive, getEventoPorId, erroRegraEvento, setField, getEventosSheet, getSheet,
   invalidarCacheSite, VERSAO_WEBAPP, UPLOAD_PREFIXO, getStatusEventoByFolderId, interpretarNomePasta */

var ULTIMA_EXECUCAO_KEY = 'ULTIMA_EXECUCAO';
var ULTIMA_CONCILIACAO_KEY = 'ULTIMA_CONCILIACAO';
var ALERTA_ESPACO_KEY = 'ALERTA_ESPACO_EM';
var ALERTA_ESPACO_LIMIAR = 0.85;
var ALERTA_ESPACO_INTERVALO_MS = 24 * 60 * 60 * 1000;
var TAMANHO_PASTAS_CACHE = 'SISTEMA_TAMANHO_PASTAS';
var TAMANHO_PASTAS_TTL_S = 6 * 60 * 60;
var TAMANHO_PASTAS_TEMPO_MAX_MS = 4000;
var LIBERACAO_TEMPO_MAX_MS = 4 * 60 * 1000;
var LIBERACAO_PEDIDO_RECENTE_MS = 48 * 60 * 60 * 1000;
var PEDIDO_STATUS_CONFIRMADO = 'Pagamento Confirmado';
var PEDIDO_STATUS_FALHOS = ['rejected', 'cancelled', 'refunded', 'charged_back', 'expired', 'Cancelado', 'Expirado'];

var PROPRIEDADES_DIAGNOSTICO = [
  ['SOURCE_FOLDER_ID', true], ['ORIGINAIS_FOLDER_ID', true], ['AMOSTRAS_FOLDER_ID', true],
  ['THUMBNAILS_FOLDER_ID', false], ['SPREADSHEET_ID', true], ['BACKEND_URL', true],
  ['APPS_SCRIPT_HMAC_SECRET', true], ['WATERMARK_API_SECRET', true],
  ['CACHE_INVALIDATION_SECRET', true], ['GALLERY_CODE_SALT', true], ['ADMIN_EMAIL', false],
];
var PASTAS_DIAGNOSTICO = [
  ['origem', 'SOURCE_FOLDER_ID'], ['originais', 'ORIGINAIS_FOLDER_ID'],
  ['previas', 'AMOSTRAS_FOLDER_ID'], ['miniaturas', 'THUMBNAILS_FOLDER_ID'],
];

var _sistemaDeps = (function () {
  if (typeof module !== 'undefined' && typeof require !== 'undefined') {
    var sheet = require('./Sheet');
    var upload = require('./Upload');
    var pick = function (source, name) {
      return function () { return (global[name] || source[name]).apply(this, arguments); };
    };
    return {
      armazenamentoDrive: pick(upload, 'armazenamentoDrive'),
      versao: function () { return upload.VERSAO_WEBAPP; },
      prefixoEnvio: function () { return upload.UPLOAD_PREFIXO; },
      getEventoPorId: pick(sheet, 'getEventoPorId'),
      erroRegraEvento: pick(sheet, 'erroRegraEvento'),
      setField: pick(sheet, 'setField'),
      getSheet: pick(sheet, 'getSheet'),
      invalidarCacheSite: pick(sheet, 'invalidarCacheSite'),
      getStatusEventoByFolderId: pick(sheet, 'getStatusEventoByFolderId'),
      interpretarNomePasta: pick(require('./EventQueue'), 'interpretarNomePasta'),
    };
  }
  return {
    armazenamentoDrive: function () { return armazenamentoDrive.apply(this, arguments); },
    versao: function () { return VERSAO_WEBAPP; },
    prefixoEnvio: function () { return UPLOAD_PREFIXO; },
    getEventoPorId: function () { return getEventoPorId.apply(this, arguments); },
    erroRegraEvento: function () { return erroRegraEvento.apply(this, arguments); },
    setField: function () { return setField.apply(this, arguments); },
    getSheet: function () { return getSheet.apply(this, arguments); },
    invalidarCacheSite: function () { return invalidarCacheSite.apply(this, arguments); },
    getStatusEventoByFolderId: function () { return getStatusEventoByFolderId.apply(this, arguments); },
    interpretarNomePasta: function () { return interpretarNomePasta.apply(this, arguments); },
  };
}());

function _propriedade(chave) {
  return PropertiesService.getScriptProperties().getProperty(chave);
}

function _lerJson(texto) {
  if (!texto) return null;
  try { return JSON.parse(texto); } catch (error) { return null; }
}

// ─── Registro de execucao do gatilho ─────────────────────────────────────────

function registrarUltimaExecucao(dados) {
  try {
    PropertiesService.getScriptProperties().setProperty(ULTIMA_EXECUCAO_KEY, JSON.stringify(dados));
  } catch (error) {
    Logger.log('Falha ao registrar ultima execucao: ' + error.message);
  }
}

function _gatilhoProcessamento() {
  var gatilhos = ScriptApp.getProjectTriggers();
  for (var i = 0; i < gatilhos.length; i++) {
    var gatilho = gatilhos[i];
    var handler = gatilho.getHandlerFunction ? gatilho.getHandlerFunction() : '';
    var fonte = gatilho.getEventType ? String(gatilho.getEventType()) : '';
    if (handler === 'processarEventos' && (!fonte || fonte === 'CLOCK')) return true;
  }
  return false;
}

// ─── Diagnostico ─────────────────────────────────────────────────────────────

function _pastasDeEntrada() {
  var resultado = { quarentena: [], enviando: 0, envioMaisAntigo: null };
  var sourceId = _propriedade('SOURCE_FOLDER_ID');
  if (!sourceId) return resultado;
  var prefixo = _sistemaDeps.prefixoEnvio();
  var subpastas = DriveApp.getFolderById(sourceId).getFolders();
  while (subpastas.hasNext()) {
    var pasta = subpastas.next();
    var nome = pasta.getName();
    if (nome.indexOf('_ERRO_') === 0 || nome.indexOf('_QUARANTINE_') === 0) {
      resultado.quarentena.push(_detalheQuarentena(pasta, nome));
    } else if (nome.indexOf(prefixo) === 0) {
      resultado.enviando += 1;
      var criada = pasta.getDateCreated().toISOString();
      if (!resultado.envioMaisAntigo || criada < resultado.envioMaisAntigo) resultado.envioMaisAntigo = criada;
    }
  }
  return resultado;
}

/** Quarentena: evento ligado (se houver), fotos em _FALHAS e se o nome da pasta e valido. */
function _detalheQuarentena(pasta, nome) {
  var detalhe = { nome: nome, folderId: pasta.getId(), desde: pasta.getLastUpdated().toISOString(), eventoId: '', falhas: 0, nomeValido: true };
  try {
    var falhas = pasta.getFoldersByName('_FALHAS');
    if (falhas.hasNext()) {
      var arquivos = falhas.next().getFiles();
      while (arquivos.hasNext()) { arquivos.next(); detalhe.falhas += 1; }
    }
    detalhe.nomeValido = Boolean(_sistemaDeps.interpretarNomePasta(nome).valido);
    var evento = _sistemaDeps.getStatusEventoByFolderId(pasta.getId());
    if (evento && evento.eventoId) detalhe.eventoId = evento.eventoId;
  } catch (error) {
    Logger.log('Detalhe de quarentena indisponivel (' + nome + '): ' + error.message);
  }
  return detalhe;
}

/** Soma o tamanho das pastas de armazenamento. Caro: guardado em cache por 6 horas. */
function tamanhoPastas(forcar) {
  var cache = CacheService.getScriptCache();
  if (!forcar) {
    var salvo = _lerJson(cache.get(TAMANHO_PASTAS_CACHE));
    if (salvo) return salvo;
  }
  var inicio = Date.now();
  var resultado = { calculadoEm: new Date().toISOString(), completo: true, pastas: {} };
  var vistas = {};
  PASTAS_DIAGNOSTICO.slice(1).forEach(function (definicao) {
    var id = _propriedade(definicao[1]);
    if (!id || vistas[id]) return;
    vistas[id] = true;
    var total = 0;
    var arquivos = 0;
    try {
      var iterator = DriveApp.getFolderById(id).getFiles();
      while (iterator.hasNext()) {
        if (Date.now() - inicio > TAMANHO_PASTAS_TEMPO_MAX_MS) { resultado.completo = false; break; }
        total += iterator.next().getSize();
        arquivos += 1;
      }
    } catch (error) {
      resultado.completo = false;
    }
    resultado.pastas[definicao[0]] = { bytes: total, arquivos: arquivos };
  });
  if (resultado.completo) cache.put(TAMANHO_PASTAS_CACHE, JSON.stringify(resultado), TAMANHO_PASTAS_TTL_S);
  return resultado;
}

function diagnosticoSistema() {
  var propriedades = {};
  PROPRIEDADES_DIAGNOSTICO.forEach(function (definicao) {
    propriedades[definicao[0]] = { presente: Boolean(_propriedade(definicao[0])), obrigatoria: definicao[1] };
  });

  var pastas = {};
  PASTAS_DIAGNOSTICO.forEach(function (definicao) {
    var id = _propriedade(definicao[1]);
    if (!id) { pastas[definicao[0]] = 'ausente'; return; }
    try {
      pastas[definicao[0]] = DriveApp.getFolderById(id).isTrashed() ? 'na_lixeira' : 'ok';
    } catch (error) {
      pastas[definicao[0]] = 'inacessivel';
    }
  });

  var entrada = { quarentena: [], enviando: 0, envioMaisAntigo: null };
  try { entrada = _pastasDeEntrada(); } catch (error) { Logger.log('Diagnostico sem pasta de entrada: ' + error.message); }

  var armazenamento = _sistemaDeps.armazenamentoDrive();
  try {
    armazenamento.pastas = tamanhoPastas(false);
  } catch (error) {
    armazenamento.pastas = null;
  }

  var lock = _lerJson(_propriedade('PROCESSING_LOCK'));
  return {
    versao: _sistemaDeps.versao(),
    verificadoEm: new Date().toISOString(),
    gatilho: _gatilhoProcessamento(),
    ultimaExecucao: _lerJson(_propriedade(ULTIMA_EXECUCAO_KEY)),
    conciliacao: _lerJson(_propriedade(ULTIMA_CONCILIACAO_KEY)),
    lock: lock ? { eventoId: lock.eventoId || '', desde: new Date(Number(lock.ts) || 0).toISOString() } : null,
    propriedades: propriedades,
    pastas: pastas,
    quarentena: entrada.quarentena,
    enviando: { quantidade: entrada.enviando, maisAntigo: entrada.envioMaisAntigo },
    armazenamento: armazenamento,
    email: { cotaRestante: MailApp.getRemainingDailyQuota ? MailApp.getRemainingDailyQuota() : null },
  };
}

// ─── Alerta de espaco ────────────────────────────────────────────────────────

function verificarAlertaEspaco() {
  var armazenamento = _sistemaDeps.armazenamentoDrive();
  if (!(armazenamento.limite > 0)) return false;
  var uso = armazenamento.usado / armazenamento.limite;
  if (uso < ALERTA_ESPACO_LIMIAR) return false;
  var ultimo = Number(_propriedade(ALERTA_ESPACO_KEY)) || 0;
  if (Date.now() - ultimo < ALERTA_ESPACO_INTERVALO_MS) return false;
  var destino = _propriedade('ADMIN_EMAIL');
  if (!destino) return false;
  MailApp.sendEmail({
    to: destino,
    subject: '[Pascom Drive] Drive com ' + Math.round(uso * 100) + '% de uso',
    body: 'O Google Drive da Pascom esta com ' + Math.round(uso * 100) + '% do espaco usado.\n\n' +
      'Abra o Painel Pascom > Sistema para ver os eventos arquivados e liberar espaco.\n' +
      'Sem espaco livre, novos envios de fotos serao recusados.',
  });
  PropertiesService.getScriptProperties().setProperty(ALERTA_ESPACO_KEY, String(Date.now()));
  return true;
}

// ─── Liberacao de espaco de eventos arquivados ───────────────────────────────

function _abaComoObjetos(nome) {
  var ss = SpreadsheetApp.openById(_propriedade('SPREADSHEET_ID'));
  var sheet = ss.getSheetByName(nome);
  if (!sheet) return { sheet: null, linhas: [] };
  var values = sheet.getDataRange().getValues();
  var headers = values[0] || [];
  var linhas = [];
  for (var i = 1; i < values.length; i++) {
    var item = { _rowNumber: i + 1 };
    headers.forEach(function (header, index) { item[header] = values[i][index]; });
    linhas.push(item);
  }
  return { sheet: sheet, linhas: linhas };
}

function _pedidoFalhou(status) {
  return PEDIDO_STATUS_FALHOS.indexOf(String(status || '')) !== -1;
}

/**
 * Classifica as fotos do evento. "Vendida" e conservador: qualquer pedido que nao falhou
 * (confirmado, pendente ou divergente) segura o original.
 */
function _fotosDoEvento(eventoId) {
  _sistemaDeps.getSheet(); // garante a coluna ArquivosLiberados
  var fotos = _abaComoObjetos('Fotos');
  var pedidos = {};
  _abaComoObjetos('Pedidos').linhas.forEach(function (pedido) { pedidos[pedido.PedidoID] = pedido; });
  var fotosDoEvento = fotos.linhas.filter(function (foto) { return foto.EventoID === eventoId; });
  var ids = {};
  fotosDoEvento.forEach(function (foto) { ids[foto.FotoID] = true; });

  var seguradas = {};
  var pendentesRecentes = 0;
  _abaComoObjetos('ItensPedido').linhas.forEach(function (item) {
    if (!ids[item.FotoID] && item.EventoID !== eventoId) return;
    var pedido = pedidos[item.PedidoID];
    if (!pedido || _pedidoFalhou(pedido.Status)) return;
    seguradas[item.FotoID] = true;
    if (pedido.Status !== PEDIDO_STATUS_CONFIRMADO) {
      var criado = new Date(pedido.DataCriacao).getTime();
      if (!isFinite(criado) || Date.now() - criado < LIBERACAO_PEDIDO_RECENTE_MS) pendentesRecentes += 1;
    }
  });
  return { sheet: fotos.sheet, fotos: fotosDoEvento, vendidas: seguradas, pendentesRecentes: pendentesRecentes };
}

function _arquivosParaLiberar(foto, vendida) {
  var ids = [];
  if (foto.PreviewFileID) ids.push(foto.PreviewFileID);
  if (foto.ThumbnailFileID && foto.ThumbnailFileID !== foto.PreviewFileID) ids.push(foto.ThumbnailFileID);
  if (!vendida && foto.OriginalFileID) ids.push(foto.OriginalFileID);
  return ids;
}

function _tamanhoArquivo(id) {
  try {
    var arquivo = DriveApp.getFileById(id);
    return arquivo.isTrashed() ? { bytes: 0, lixeira: true } : { bytes: arquivo.getSize(), lixeira: false };
  } catch (error) {
    return { bytes: 0, lixeira: true };
  }
}

function _exigirArquivado(selected) {
  if (selected.item.Publicacao !== 'arquivado') {
    throw _sistemaDeps.erroRegraEvento('Arquive o evento antes de liberar espaco.');
  }
}

function estimarLiberacaoEvento(payload) {
  var selected = _sistemaDeps.getEventoPorId(payload && payload.eventoId);
  _exigirArquivado(selected);
  var dados = _fotosDoEvento(selected.item.EventoID);
  var resumo = { bytesLiberados: 0, arquivos: 0, fotos: dados.fotos.length, originaisMantidos: 0, bytesMantidos: 0 };
  dados.fotos.forEach(function (foto) {
    var vendida = Boolean(dados.vendidas[foto.FotoID]);
    if (vendida) {
      resumo.originaisMantidos += 1;
      if (foto.OriginalFileID) resumo.bytesMantidos += _tamanhoArquivo(foto.OriginalFileID).bytes;
    }
    if (foto.ArquivosLiberados === 'SIM') return;
    _arquivosParaLiberar(foto, vendida).forEach(function (id) {
      var info = _tamanhoArquivo(id);
      if (info.lixeira) return;
      resumo.bytesLiberados += info.bytes;
      resumo.arquivos += 1;
    });
  });
  resumo.pedidosPendentes = dados.pendentesRecentes;
  resumo.situacao = selected.item.EspacoLiberacao || '';
  return resumo;
}

/**
 * Manda para a lixeira do Drive as previas e miniaturas de todas as fotos e os originais
 * das fotos nunca vendidas. Idempotente: se o tempo acabar, fica "parcial" e pode ser repetida.
 */
function liberarEspacoEvento(eventoId, opcoes) {
  var selected = _sistemaDeps.getEventoPorId(eventoId);
  _exigirArquivado(selected);
  var dados = _fotosDoEvento(eventoId);
  if (dados.pendentesRecentes > 0) {
    throw _sistemaDeps.erroRegraEvento(
      'Ha ' + dados.pendentesRecentes + ' pedido(s) deste evento aguardando pagamento. Tente de novo em 48 horas.'
    );
  }
  var tempoMax = (opcoes && opcoes.tempoMaxMs) || LIBERACAO_TEMPO_MAX_MS;
  var inicio = Date.now();
  var bytes = 0;
  var arquivos = 0;
  var concluida = true;

  for (var i = 0; i < dados.fotos.length; i++) {
    var foto = dados.fotos[i];
    if (foto.ArquivosLiberados === 'SIM') continue;
    if (Date.now() - inicio > tempoMax) { concluida = false; break; }
    _arquivosParaLiberar(foto, Boolean(dados.vendidas[foto.FotoID])).forEach(function (id) {
      try {
        var arquivo = DriveApp.getFileById(id);
        if (arquivo.isTrashed()) return;
        bytes += arquivo.getSize();
        arquivo.setTrashed(true);
        arquivos += 1;
      } catch (error) {
        Logger.log('Arquivo ja indisponivel ao liberar espaco (' + id + '): ' + error.message);
      }
    });
    _sistemaDeps.setField(dados.sheet, foto._rowNumber, 'ArquivosLiberados', 'SIM');
  }

  var acumulado = (Number(selected.item.EspacoLiberadoBytes) || 0) + bytes;
  var situacao = concluida ? 'concluida' : 'parcial';
  _sistemaDeps.setField(selected.sheet, selected.rowNumber, 'EspacoLiberacao', situacao);
  _sistemaDeps.setField(selected.sheet, selected.rowNumber, 'EspacoLiberadoEm', new Date().toISOString());
  _sistemaDeps.setField(selected.sheet, selected.rowNumber, 'EspacoLiberadoBytes', acumulado);
  try { CacheService.getScriptCache().remove(TAMANHO_PASTAS_CACHE); } catch (error) { /* cache opcional */ }
  _sistemaDeps.invalidarCacheSite(eventoId);
  return {
    situacao: situacao, arquivos: arquivos, bytesLiberados: bytes, bytesAcumulados: acumulado,
    originaisMantidos: Object.keys(dados.vendidas).length,
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    ULTIMA_EXECUCAO_KEY, ALERTA_ESPACO_KEY, diagnosticoSistema, tamanhoPastas, registrarUltimaExecucao,
    verificarAlertaEspaco, estimarLiberacaoEvento, liberarEspacoEvento,
  };
}
