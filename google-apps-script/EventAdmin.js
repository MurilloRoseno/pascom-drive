// EventAdmin.js — Acoes de gestao de eventos chamadas pelo Painel Pascom via Web App (doPost em Upload.js).
// As regras de negocio ficam em Sheet.js e sao as mesmas usadas pelo menu da planilha.
// Dependencias globais (Apps Script): LockService, Logger.

/* global LockService, Logger, ensureSheet, appendMappedRow, publicarEvento, despublicarEvento,
   autorizarVendaEvento, revogarVendaEvento, definirVisibilidadeEvento, gerarCodigoEvento,
   revogarCodigoEvento, arquivarEvento, editarEvento, liberarEspacoEvento, reprocessarEvento,
   descartarFalhasEvento, enfileirarTrocaCapa */

// Chamado pelo painel, liberarEspaco devolve 'parcial' antes do limite de 25 s do backend.
var LIBERAR_ESPACO_WEBAPP_MS = 18000;

var AUDITORIA_HEADERS = ['Quando', 'Quem', 'Acao', 'EventoID', 'Detalhe'];

var _eventAdminDeps = (function () {
  if (typeof module !== 'undefined' && typeof require !== 'undefined') {
    var sheet = require('./Sheet');
    var pick = function (name) {
      return function () { return (global[name] || sheet[name]).apply(this, arguments); };
    };
    return {
      ensureSheet: pick('ensureSheet'),
      appendMappedRow: pick('appendMappedRow'),
      publicarEvento: pick('publicarEvento'),
      despublicarEvento: pick('despublicarEvento'),
      autorizarVendaEvento: pick('autorizarVendaEvento'),
      revogarVendaEvento: pick('revogarVendaEvento'),
      definirVisibilidadeEvento: pick('definirVisibilidadeEvento'),
      gerarCodigoEvento: pick('gerarCodigoEvento'),
      revogarCodigoEvento: pick('revogarCodigoEvento'),
      arquivarEvento: pick('arquivarEvento'),
      editarEvento: pick('editarEvento'),
      liberarEspacoEvento: function () {
        var sistema = require('./Sistema');
        return (global.liberarEspacoEvento || sistema.liberarEspacoEvento).apply(this, arguments);
      },
      reprocessarEvento: function () { return require('./Processamento').reprocessarEvento.apply(this, arguments); },
      descartarFalhasEvento: function () { return require('./Processamento').descartarFalhasEvento.apply(this, arguments); },
      enfileirarTrocaCapa: function () { return require('./Processamento').enfileirarTrocaCapa.apply(this, arguments); },
    };
  }
  return {
    ensureSheet: function () { return ensureSheet.apply(this, arguments); },
    appendMappedRow: function () { return appendMappedRow.apply(this, arguments); },
    publicarEvento: function () { return publicarEvento.apply(this, arguments); },
    despublicarEvento: function () { return despublicarEvento.apply(this, arguments); },
    autorizarVendaEvento: function () { return autorizarVendaEvento.apply(this, arguments); },
    revogarVendaEvento: function () { return revogarVendaEvento.apply(this, arguments); },
    definirVisibilidadeEvento: function () { return definirVisibilidadeEvento.apply(this, arguments); },
    gerarCodigoEvento: function () { return gerarCodigoEvento.apply(this, arguments); },
    revogarCodigoEvento: function () { return revogarCodigoEvento.apply(this, arguments); },
    arquivarEvento: function () { return arquivarEvento.apply(this, arguments); },
    editarEvento: function () { return editarEvento.apply(this, arguments); },
    liberarEspacoEvento: function () { return liberarEspacoEvento.apply(this, arguments); },
    reprocessarEvento: function () { return reprocessarEvento.apply(this, arguments); },
    descartarFalhasEvento: function () { return descartarFalhasEvento.apply(this, arguments); },
    enfileirarTrocaCapa: function () { return enfileirarTrocaCapa.apply(this, arguments); },
  };
}());

function registrarAuditoriaPascom(acao, payload, detalhe) {
  try {
    var sheet = _eventAdminDeps.ensureSheet('AuditoriaPascom', AUDITORIA_HEADERS);
    _eventAdminDeps.appendMappedRow(sheet, {
      Quando: new Date().toISOString(),
      Quem: payload.quem || '',
      Acao: acao,
      EventoID: payload.eventoId || '',
      Detalhe: detalhe || '',
    });
  } catch (error) {
    Logger.log('Falha ao registrar auditoria Pascom: ' + error.message);
  }
}

/**
 * Executa a acao com o lock do script (evita colidir com o trigger de 5 minutos)
 * e registra auditoria. `detalhar` recebe o resultado e devolve texto seguro:
 * o codigo de acesso em claro nunca vai para a planilha.
 */
function executarAcaoEvento(nome, payload, executar, detalhar) {
  if (!payload || !/^[A-Za-z0-9_-]{1,120}$/.test(String(payload.eventoId || ''))) {
    var invalid = new Error('Evento invalido.');
    invalid.codigo = 'dados_invalidos';
    throw invalid;
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var resultado = executar(payload) || {};
    registrarAuditoriaPascom(nome, payload, detalhar ? detalhar(resultado, payload) : '');
    return resultado;
  } finally {
    lock.releaseLock();
  }
}

var EVENTO_ACOES = {
  publicar: function (p) {
    return executarAcaoEvento('publicar', p, function () { _eventAdminDeps.publicarEvento(p.eventoId); });
  },
  despublicar: function (p) {
    return executarAcaoEvento('despublicar', p, function () { _eventAdminDeps.despublicarEvento(p.eventoId); });
  },
  autorizarVenda: function (p) {
    return executarAcaoEvento('autorizarVenda', p, function () { _eventAdminDeps.autorizarVendaEvento(p.eventoId); });
  },
  revogarVenda: function (p) {
    return executarAcaoEvento('revogarVenda', p, function () { _eventAdminDeps.revogarVendaEvento(p.eventoId); });
  },
  definirVisibilidade: function (p) {
    return executarAcaoEvento('definirVisibilidade', p, function () {
      _eventAdminDeps.definirVisibilidadeEvento(p.eventoId, p.visibilidade);
    }, function () { return 'visibilidade: ' + p.visibilidade; });
  },
  gerarCodigo: function (p) {
    return executarAcaoEvento('gerarCodigo', p, function () {
      return _eventAdminDeps.gerarCodigoEvento(p.eventoId);
    }, function (resultado) { return 'versao ' + resultado.versao; });
  },
  revogarCodigo: function (p) {
    return executarAcaoEvento('revogarCodigo', p, function () {
      return _eventAdminDeps.revogarCodigoEvento(p.eventoId);
    }, function (resultado) { return 'versao ' + resultado.versao; });
  },
  arquivar: function (p) {
    return executarAcaoEvento('arquivar', p, function () { _eventAdminDeps.arquivarEvento(p.eventoId); });
  },
  editar: function (p) {
    return executarAcaoEvento('editar', p, function () {
      return _eventAdminDeps.editarEvento(p.eventoId, p.campos);
    }, function () { return 'campos: ' + Object.keys(p.campos || {}).join(', '); });
  },
  liberarEspaco: function (p) {
    return executarAcaoEvento('liberarEspaco', p, function () {
      return _eventAdminDeps.liberarEspacoEvento(p.eventoId, { tempoMaxMs: LIBERAR_ESPACO_WEBAPP_MS });
    }, function (resultado) {
      return resultado.situacao + ': ' + resultado.arquivos + ' arquivos, ' + resultado.bytesLiberados + ' bytes';
    });
  },
  reprocessar: function (p) {
    return executarAcaoEvento('reprocessar', p, function () {
      return _eventAdminDeps.reprocessarEvento(p.eventoId);
    }, function (resultado) { return 'fotos devolvidas: ' + resultado.devolvidas; });
  },
  descartarFalhas: function (p) {
    return executarAcaoEvento('descartarFalhas', p, function () {
      return _eventAdminDeps.descartarFalhasEvento(p.eventoId);
    }, function (resultado) { return 'descartadas: ' + resultado.descartadas; });
  },
  trocarCapa: function (p) {
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(String(p && p.fotoId || ''))) {
      var invalida = new Error('Foto invalida.');
      invalida.codigo = 'dados_invalidos';
      throw invalida;
    }
    return executarAcaoEvento('trocarCapa', p, function () {
      return _eventAdminDeps.enfileirarTrocaCapa(p.eventoId, p.fotoId, p.quem);
    }, function () { return 'na fila: ' + p.fotoId; });
  },
};

if (typeof module !== 'undefined') {
  module.exports = { EVENTO_ACOES, AUDITORIA_HEADERS, executarAcaoEvento, registrarAuditoriaPascom };
}
