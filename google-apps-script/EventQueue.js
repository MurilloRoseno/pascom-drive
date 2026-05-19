// EventQueue.js — Fila transacional de eventos via Script Properties.
// O lock evita processamento simultâneo de dois eventos.
// Dependências globais (Apps Script): PropertiesService, DriveApp, Logger, Utilities
// Em contexto Node/Jest: getStatusEvento e getStatusEventoByFolderId são injetados pelo caller.

/* global PropertiesService, DriveApp, Logger, Utilities, getStatusEvento, getStatusEventoByFolderId */

var LOCK_KEY    = 'PROCESSING_LOCK';
var LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutos (máximo por execução Apps Script)

function acquireLock(eventoId) {
  var props    = PropertiesService.getScriptProperties();
  var existing = props.getProperty(LOCK_KEY);
  if (existing) {
    var lock = JSON.parse(existing);
    var age  = Date.now() - lock.ts;
    if (age < LOCK_TTL_MS) {
      return false; // lock ativo, não pode processar
    }
    // lock expirado (Apps Script crashou) — libera e continua
    Logger.log('Lock expirado detectado para ' + lock.eventoId + ', liberando após ' + Math.round(age / 1000) + 's');
  }
  props.setProperty(LOCK_KEY, JSON.stringify({ eventoId: eventoId, ts: Date.now() }));
  return true;
}

function releaseLock() {
  PropertiesService.getScriptProperties().deleteProperty(LOCK_KEY);
}

function getLockStatus() {
  var raw = PropertiesService.getScriptProperties().getProperty(LOCK_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Gera eventoId único a partir do nome da pasta.
 * Formato: SLUG_YYYYMMDD (com sufixo _B, _C se já existir no mesmo dia)
 */
function gerarEventoId(nomePasta) {
  var slug = nomePasta
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  var hoje  = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd');
  var base  = slug + '_' + hoje;
  var sufixos = ['', '_B', '_C', '_D', '_E'];
  for (var i = 0; i < sufixos.length; i++) {
    var candidato = base + sufixos[i];
    if (!getStatusEvento(candidato)) return candidato; // não existe → pode usar
  }
  // Fallback extremo: adiciona timestamp ms
  return base + '_' + Date.now();
}

/**
 * Lista subpastas de SOURCE_FOLDER que ainda não foram registradas.
 * Ignora pastas de quarentena (_ERRO_*).
 * Retorna array de { folderId, nomePasta }
 */
function listarEventosNovos() {
  var sourceId  = PropertiesService.getScriptProperties().getProperty('SOURCE_FOLDER_ID');
  var source    = DriveApp.getFolderById(sourceId);
  var subpastas = source.getFolders();
  var novos     = [];

  while (subpastas.hasNext()) {
    var pasta = subpastas.next();
    var nome  = pasta.getName();
    // Ignora pastas de quarentena
    if (nome.indexOf('_ERRO_') === 0 || nome.indexOf('_QUARANTINE_') === 0) continue;
    // Verifica se já há um evento ativo/concluído com esse folder ID
    var ev = getStatusEventoByFolderId(pasta.getId());
    if (!ev || ev.status === 'Erro') {
      novos.push({ folderId: pasta.getId(), nomePasta: nome });
    }
  }
  return novos;
}

if (typeof module !== 'undefined') {
  module.exports = { acquireLock, releaseLock, getLockStatus, gerarEventoId, listarEventosNovos };
}
