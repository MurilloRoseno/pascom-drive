// Upload.js — Web App chamado pelo backend para o envio de fotos pelo Painel Pascom.
// O navegador envia os bytes direto para o Google Drive (upload retomavel); este
// arquivo so cria a pasta do evento, abre as sessoes como dono do Drive e finaliza.
// Dependencias globais (Apps Script): DriveApp, ScriptApp, UrlFetchApp, CacheService,
// ContentService, PropertiesService, Logger.

/* global DriveApp, ScriptApp, UrlFetchApp, CacheService, ContentService, PropertiesService, Logger,
   interpretarNomePasta, getSourceFolder, ensureSheet, appendMappedRow, getEventosSheet,
   notificarAdministracao, hmacSha256Hex */

// Incrementar a cada mudanca nas acoes do Web App; o backend compara para detectar implantacao antiga.
var VERSAO_WEBAPP = 5;
var UPLOAD_PREFIXO = '_ENVIANDO__';
var UPLOAD_JANELA_MS = 5 * 60 * 1000;
var UPLOAD_ABANDONO_MS = 48 * 60 * 60 * 1000;
var UPLOAD_TAMANHO_MAXIMO = 40 * 1024 * 1024;
var UPLOAD_MAX_ARQUIVOS_POR_LOTE = 20;
var UPLOAD_TIPOS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
var ENVIOS_HEADERS = ['Quando', 'Quem', 'UploadID', 'NomePasta', 'Arquivos', 'Status', 'Detalhe'];

var _uploadDeps = (function () {
  if (typeof module !== 'undefined' && typeof require !== 'undefined') {
    var eventQueue = require('./EventQueue');
    var drive = require('./Drive');
    var sheet = require('./Sheet');
    var security = require('./Security');
    return {
      interpretarNomePasta: eventQueue.interpretarNomePasta,
      getSourceFolder: drive.getSourceFolder,
      ensureSheet: function () { return (global.ensureSheet || sheet.ensureSheet).apply(this, arguments); },
      appendMappedRow: function () { return (global.appendMappedRow || sheet.appendMappedRow).apply(this, arguments); },
      getEventosSheet: function () { return (global.getEventosSheet || sheet.getEventosSheet).apply(this, arguments); },
      notificarAdministracao: function () { return (global.notificarAdministracao || sheet.notificarAdministracao).apply(this, arguments); },
      hmacSha256Hex: security.hmacSha256Hex,
    };
  }
  return {
    interpretarNomePasta: function () { return interpretarNomePasta.apply(this, arguments); },
    getSourceFolder: function () { return getSourceFolder.apply(this, arguments); },
    ensureSheet: function () { return ensureSheet.apply(this, arguments); },
    appendMappedRow: function () { return appendMappedRow.apply(this, arguments); },
    getEventosSheet: function () { return getEventosSheet.apply(this, arguments); },
    notificarAdministracao: function () { return notificarAdministracao.apply(this, arguments); },
    hmacSha256Hex: function () { return hmacSha256Hex.apply(this, arguments); },
  };
}());

function erroUpload(codigo, mensagem) {
  var error = new Error(mensagem);
  error.codigo = codigo;
  return error;
}

function respostaUpload(corpo) {
  return ContentService.createTextOutput(JSON.stringify(corpo)).setMimeType(ContentService.MimeType.JSON);
}

function comparacaoSegura(a, b) {
  var left = String(a || '');
  var right = String(b || '');
  if (left.length !== right.length) return false;
  var diff = 0;
  for (var i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

/**
 * Envelope assinado pelo backend: { acao, timestamp, payload (string JSON), assinatura }.
 * Web Apps nao expoem headers HTTP, por isso a assinatura viaja no corpo.
 */
function verificarAssinaturaUpload(envelope) {
  var secret = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_HMAC_SECRET');
  if (!secret) throw erroUpload('nao_configurado', 'APPS_SCRIPT_HMAC_SECRET ausente no Apps Script.');
  var timestamp = Number(envelope.timestamp);
  if (!isFinite(timestamp) || Math.abs(Date.now() - timestamp) > UPLOAD_JANELA_MS) {
    throw erroUpload('assinatura_invalida', 'Requisicao expirada.');
  }
  var esperado = _uploadDeps.hmacSha256Hex(
    String(envelope.timestamp) + '.' + envelope.acao + '.' + envelope.payload,
    secret
  );
  if (!comparacaoSegura(envelope.assinatura, esperado)) {
    throw erroUpload('assinatura_invalida', 'Assinatura invalida.');
  }
  var cache = CacheService.getScriptCache();
  var chave = 'upl_' + String(envelope.assinatura).slice(0, 64);
  if (cache.get(chave)) throw erroUpload('assinatura_invalida', 'Requisicao repetida.');
  cache.put(chave, '1', 600);
}

function slugTituloEvento(titulo) {
  return String(titulo || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9À-ɏ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function montarNomePastaEvento(dados) {
  var nome = [dados.categoria, dados.data, slugTituloEvento(dados.titulo)].join('__');
  var info = _uploadDeps.interpretarNomePasta(nome);
  if (!info.valido) throw erroUpload('dados_invalidos', 'Categoria, data ou titulo invalidos para o evento.');
  return nome;
}

function extensaoArquivo(nome) {
  var match = /\.([a-z0-9]+)$/i.exec(String(nome || ''));
  return match ? match[1].toLowerCase() : '';
}

function nomeArquivoSeguro(nome) {
  var base = String(nome || '').split(/[\\/]/).pop().split('').filter(function(c) { return c.charCodeAt(0) >= 32; }).join('').trim();
  if (!base || base.length > 180) throw erroUpload('dados_invalidos', 'Nome de arquivo invalido.');
  return base;
}

function getPastaEnvio(uploadId) {
  var pasta;
  try {
    pasta = DriveApp.getFolderById(uploadId);
  } catch (error) {
    throw erroUpload('envio_nao_encontrado', 'Envio nao encontrado.');
  }
  if (pasta.getName().indexOf(UPLOAD_PREFIXO) !== 0 || pasta.isTrashed()) {
    throw erroUpload('envio_nao_encontrado', 'Envio nao esta mais aberto.');
  }
  var sourceId = _uploadDeps.getSourceFolder().getId();
  var parents = pasta.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === sourceId) return pasta;
  }
  throw erroUpload('envio_nao_encontrado', 'Envio fora da pasta de entrada.');
}

function registrarEnvio(dados) {
  try {
    var sheet = _uploadDeps.ensureSheet('EnviosPascom', ENVIOS_HEADERS);
    _uploadDeps.appendMappedRow(sheet, {
      Quando: new Date().toISOString(),
      Quem: dados.quem || '',
      UploadID: dados.uploadId || '',
      NomePasta: dados.nomePasta || '',
      Arquivos: dados.arquivos !== undefined ? dados.arquivos : '',
      Status: dados.status || '',
      Detalhe: dados.detalhe || '',
    });
  } catch (error) {
    Logger.log('Falha ao registrar envio: ' + error.message);
  }
}

function eventoJaExiste(nomePasta, source) {
  if (source.getFoldersByName(nomePasta).hasNext()) return true;
  if (source.getFoldersByName(UPLOAD_PREFIXO + nomePasta).hasNext()) return true;
  var data = _uploadDeps.getEventosSheet().getDataRange().getValues();
  var col = (data[0] || []).indexOf('NomePasta');
  if (col === -1) return false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][col]) === nomePasta) return true;
  }
  return false;
}

function armazenamentoDrive() {
  var usado = DriveApp.getStorageUsed();
  var limite = DriveApp.getStorageLimit();
  return { usado: usado, limite: limite, livre: limite > 0 ? Math.max(limite - usado, 0) : null };
}

function uploadCriarEvento(payload) {
  var nomePasta = montarNomePastaEvento(payload);
  var source = _uploadDeps.getSourceFolder();
  if (eventoJaExiste(nomePasta, source)) {
    throw erroUpload('evento_duplicado', 'Ja existe um evento com esta categoria, data e titulo.');
  }
  var armazenamento = armazenamentoDrive();
  var bytes = Number(payload.bytesTotais) || 0;
  if (armazenamento.livre !== null && bytes > armazenamento.livre) {
    throw erroUpload('sem_espaco', 'O Drive da Pascom nao tem espaco livre suficiente para este envio.');
  }
  var pasta = source.createFolder(UPLOAD_PREFIXO + nomePasta);
  registrarEnvio({
    quem: payload.quem, uploadId: pasta.getId(), nomePasta: nomePasta,
    arquivos: Number(payload.totalArquivos) || 0, status: 'enviando',
  });
  return { uploadId: pasta.getId(), nomePasta: nomePasta, armazenamento: armazenamento };
}

function uploadCriarSessoes(payload) {
  var pasta = getPastaEnvio(payload.uploadId);
  var arquivos = payload.arquivos || [];
  if (!arquivos.length || arquivos.length > UPLOAD_MAX_ARQUIVOS_POR_LOTE) {
    throw erroUpload('dados_invalidos', 'Envie entre 1 e ' + UPLOAD_MAX_ARQUIVOS_POR_LOTE + ' arquivos por lote.');
  }
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$|^http:\/\/localhost(:\d+)?$/i.test(String(payload.origem || ''))) {
    throw erroUpload('dados_invalidos', 'Origem do navegador invalida.');
  }
  var token = ScriptApp.getOAuthToken();
  var requests = arquivos.map(function(arquivo) {
    var nome = nomeArquivoSeguro(arquivo.nome);
    var mimeType = UPLOAD_TIPOS[extensaoArquivo(nome)];
    var tamanho = Number(arquivo.tamanho);
    if (!mimeType || mimeType !== arquivo.mimeType) {
      throw erroUpload('dados_invalidos', 'Formato nao aceito: ' + nome + '. Use JPG ou PNG.');
    }
    if (!(tamanho > 0) || tamanho > UPLOAD_TAMANHO_MAXIMO) {
      throw erroUpload('dados_invalidos', 'Tamanho invalido: ' + nome + ' (maximo 40 MB).');
    }
    return {
      url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size',
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      headers: {
        Authorization: 'Bearer ' + token,
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(tamanho),
        Origin: payload.origem,
      },
      payload: JSON.stringify({ name: nome, parents: [pasta.getId()], mimeType: mimeType }),
      muteHttpExceptions: true,
    };
  });
  var respostas = UrlFetchApp.fetchAll(requests);
  return {
    sessoes: respostas.map(function(resposta, index) {
      var headers = resposta.getHeaders();
      var location = headers.Location || headers.location;
      if (resposta.getResponseCode() !== 200 || !location) {
        Logger.log('Falha ao abrir sessao (' + resposta.getResponseCode() + '): ' + resposta.getContentText());
        throw erroUpload('drive_indisponivel', 'O Google Drive recusou abrir o envio. Tente novamente.');
      }
      return { nome: arquivos[index].nome, sessionUrl: location };
    }),
  };
}

function listarArquivosEnvio(pasta) {
  var arquivos = [];
  var iterator = pasta.getFiles();
  while (iterator.hasNext()) arquivos.push(iterator.next());
  return arquivos;
}

function uploadFinalizar(payload) {
  var pasta = getPastaEnvio(payload.uploadId);
  var arquivos = listarArquivosEnvio(pasta);
  var esperados = Number(payload.esperados) || 0;
  if (!arquivos.length || arquivos.length < esperados) {
    throw erroUpload('envio_incompleto', 'Chegaram ' + arquivos.length + ' de ' + esperados + ' fotos. Termine o envio antes de concluir.');
  }
  if (payload.capa) {
    var capa = null;
    arquivos.forEach(function(arquivo) {
      if (!capa && arquivo.getName() === payload.capa) capa = arquivo;
    });
    if (!capa) throw erroUpload('dados_invalidos', 'A foto escolhida como capa nao foi encontrada no envio.');
    arquivos.forEach(function(arquivo) {
      if (arquivo !== capa && /^capa\.(jpe?g|png)$/i.test(arquivo.getName())) {
        arquivo.setName('foto-' + arquivo.getName());
      }
    });
    capa.setName('capa.' + extensaoArquivo(capa.getName()));
  }
  var nomePasta = pasta.getName().slice(UPLOAD_PREFIXO.length);
  pasta.setName(nomePasta);
  registrarEnvio({
    quem: payload.quem, uploadId: pasta.getId(), nomePasta: nomePasta,
    arquivos: arquivos.length, status: 'finalizado', detalhe: payload.capa ? 'capa: ' + payload.capa : '',
  });
  return { nomePasta: nomePasta, arquivos: arquivos.length };
}

function uploadCancelar(payload) {
  var pasta = getPastaEnvio(payload.uploadId);
  var nomePasta = pasta.getName().slice(UPLOAD_PREFIXO.length);
  pasta.setTrashed(true);
  registrarEnvio({ quem: payload.quem, uploadId: payload.uploadId, nomePasta: nomePasta, status: 'cancelado' });
  return { cancelado: true };
}

var UPLOAD_ACOES = {
  criarEvento: uploadCriarEvento,
  criarSessoes: uploadCriarSessoes,
  finalizar: uploadFinalizar,
  cancelar: uploadCancelar,
  armazenamento: function () { return armazenamentoDrive(); },
  diagnostico: function () { return _sistemaModulo().diagnosticoSistema(); },
  estimarLiberacao: function (payload) { return _sistemaModulo().estimarLiberacaoEvento(payload); },
};

function _sistemaModulo() {
  if (typeof module !== 'undefined' && typeof require !== 'undefined') return require('./Sistema');
  return { diagnosticoSistema: diagnosticoSistema, estimarLiberacaoEvento: estimarLiberacaoEvento }; // eslint-disable-line no-undef
}

/** Acoes de envio (este arquivo) e de gestao de eventos (EventAdmin.js), so chaves proprias. */
function acaoWebApp(nome) {
  var eventoAcoes = (typeof module !== 'undefined' && typeof require !== 'undefined')
    ? require('./EventAdmin').EVENTO_ACOES
    : EVENTO_ACOES; // eslint-disable-line no-undef
  var pastaAcoes = (typeof module !== 'undefined' && typeof require !== 'undefined')
    ? require('./Processamento').PASTA_ACOES
    : PASTA_ACOES; // eslint-disable-line no-undef
  var registros = [UPLOAD_ACOES, eventoAcoes, pastaAcoes];
  for (var i = 0; i < registros.length; i++) {
    if (Object.prototype.hasOwnProperty.call(registros[i], nome)) return registros[i][nome];
  }
  return null;
}

function doPost(e) {
  try {
    var envelope = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    verificarAssinaturaUpload(envelope);
    var acao = acaoWebApp(envelope.acao);
    if (!acao) throw erroUpload('acao_invalida', 'Acao desconhecida.');
    return respostaUpload({ ok: true, data: acao(JSON.parse(envelope.payload || '{}')) });
  } catch (error) {
    if (!error.codigo) Logger.log('Erro inesperado no Web App de upload: ' + error.stack);
    return respostaUpload({
      ok: false,
      codigo: error.codigo || 'erro_interno',
      error: error.codigo ? error.message : 'Falha interna no Apps Script.',
    });
  }
}

/**
 * Remove envios abertos ha mais de 48h, para nao acumular
 * pastas "_ENVIANDO__" esquecidas quando alguem fecha o painel no meio.
 */
function limparEnviosAbandonados() {
  var subpastas = _uploadDeps.getSourceFolder().getFolders();
  var removidas = [];
  while (subpastas.hasNext()) {
    var pasta = subpastas.next();
    if (pasta.getName().indexOf(UPLOAD_PREFIXO) !== 0) continue;
    if (Date.now() - pasta.getDateCreated().getTime() < UPLOAD_ABANDONO_MS) continue;
    pasta.setTrashed(true);
    removidas.push(pasta.getName());
    registrarEnvio({ uploadId: pasta.getId(), nomePasta: pasta.getName(), status: 'abandonado' });
  }
  if (removidas.length) {
    _uploadDeps.notificarAdministracao('Envios abandonados movidos para a lixeira: ' + removidas.join(', '), {
      email: true, assunto: 'Envios abandonados',
    });
  }
  return removidas;
}

if (typeof module !== 'undefined') {
  module.exports = {
    UPLOAD_PREFIXO, VERSAO_WEBAPP, armazenamentoDrive, doPost, verificarAssinaturaUpload, slugTituloEvento, montarNomePastaEvento,
    eventoJaExiste, uploadCriarEvento, uploadCriarSessoes, uploadFinalizar, uploadCancelar, limparEnviosAbandonados,
  };
}
