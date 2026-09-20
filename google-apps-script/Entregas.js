// Entregas.js — Conciliacao de pagamentos e entregas, pedida pelo gatilho de 5 minutos.
// O Apps Script nao entrega nada: quem emite links e manda e-mail e o backend (a decisao
// esta registrada em Code.js). Aqui so agendamos a varredura e avisamos o responsavel,
// por MailApp, que e um canal independente do SMTP que pode ser justamente o que falhou.
// Dependencias globais (Apps Script): PropertiesService, UrlFetchApp, MailApp, Logger.

/* global PropertiesService, UrlFetchApp, MailApp, Logger, criarHeadersBackendInterno */

var CONCILIACAO_ROTA = '/api/automacao/entregas';
var CONCILIACAO_KEY = 'ULTIMA_CONCILIACAO';
var ALERTA_ENTREGA_KEY = 'ALERTA_ENTREGA_EM';
var VARREDURA_MP_KEY = 'ULTIMA_VARREDURA_MP';

// Uma execucao do Apps Script dura no maximo 6 min. Sem esta folga no fim do ciclo, a
// conciliacao seria cortada no meio e o gatilho ficaria sem registrar nada.
var CONCILIACAO_CICLO_LIMITE_MS = 330000;
var CONCILIACAO_MINIMO_MS = 30000;
var CONCILIACAO_FOLGA_MS = 10000;
var CONCILIACAO_ORCAMENTO_MAX_MS = 20000;

var ALERTA_ENTREGA_INTERVALO_MS = 24 * 60 * 60 * 1000;
// Procurar pagamento sem pedido na planilha custa uma busca na conta inteira: 1x por hora.
var VARREDURA_MP_INTERVALO_MS = 60 * 60 * 1000;
var MAX_PROBLEMAS_GUARDADOS = 5;

var _entregasSecurity = (function () {
  if (typeof module !== 'undefined' && typeof require !== 'undefined') {
    return require('./Security');
  }
  return {
    criarHeadersBackendInterno: function () { return criarHeadersBackendInterno.apply(this, arguments); },
  };
}());

function _entregasProps() {
  return PropertiesService.getScriptProperties();
}

function _resumoProblemas(problemas) {
  return (problemas || []).slice(0, MAX_PROBLEMAS_GUARDADOS).map(function (problema) {
    return {
      tipo: problema.tipo || '',
      pedidoId: problema.pedidoId || '',
      severidade: problema.severidade || 'aviso',
      motivo: problema.motivo || '',
    };
  });
}

/** Registro lido pela aba Sistema do Painel Pascom (sem dados do comprador). */
function registrarConciliacao(dados) {
  try {
    _entregasProps().setProperty(CONCILIACAO_KEY, JSON.stringify(dados));
  } catch (error) {
    Logger.log('Falha ao registrar a conciliacao: ' + error.message);
  }
}

function _textoProblemas(problemas) {
  return problemas.map(function (problema) {
    return '- ' + problema.motivo + (problema.pedidoId ? ' (pedido ' + problema.pedidoId + ')' : '');
  }).join('\n');
}

/**
 * Avisa o responsavel quando ha pedido pago sem entrega. No maximo um e-mail por dia,
 * no mesmo padrao do alerta de espaco no Drive.
 */
function avisarProblemasEntrega(dados) {
  var resumo = (dados && dados.resumo) || {};
  if (!(resumo.erros > 0)) return false;
  var props = _entregasProps();
  var destino = props.getProperty('ADMIN_EMAIL');
  if (!destino) return false;
  var ultimo = Number(props.getProperty(ALERTA_ENTREGA_KEY)) || 0;
  if (Date.now() - ultimo < ALERTA_ENTREGA_INTERVALO_MS) return false;
  var problemas = _resumoProblemas((dados.problemas || []).filter(function (problema) {
    return problema.severidade === 'erro';
  }));
  MailApp.sendEmail({
    to: destino,
    subject: '[Pascom Drive] ' + resumo.erros + ' pedido(s) precisam de atencao',
    body: 'Alguns pedidos pagos nao foram entregues ou tem valor divergente.\n\n' +
      _textoProblemas(problemas) + '\n\n' +
      'Abra o Painel Pascom > Pedidos para reenviar a entrega ou conferir no Mercado Pago.\n' +
      'Este aviso e enviado no maximo uma vez por dia.',
  });
  props.setProperty(ALERTA_ENTREGA_KEY, String(Date.now()));
  return true;
}

/**
 * Chama a rota interna do backend com a assinatura HMAC de worker e guarda o resultado.
 * Nunca lanca: falha de rede aqui nao pode derrubar o processamento de fotos.
 */
function conciliarEntregasBackend(inicioCiclo) {
  var props = _entregasProps();
  var backendUrl = props.getProperty('BACKEND_URL');
  if (!backendUrl) {
    Logger.log('Conciliacao de entregas ignorada: configure BACKEND_URL.');
    return { resultado: 'nao_configurado' };
  }
  var restante = CONCILIACAO_CICLO_LIMITE_MS - (Date.now() - (inicioCiclo || Date.now()));
  if (restante < CONCILIACAO_MINIMO_MS) {
    Logger.log('Conciliacao de entregas adiada: o ciclo terminou sem tempo sobrando.');
    return { resultado: 'sem_tempo' };
  }
  var limiteMs = Math.min(CONCILIACAO_ORCAMENTO_MAX_MS, restante - CONCILIACAO_FOLGA_MS);
  var varredura = Date.now() - (Number(props.getProperty(VARREDURA_MP_KEY)) || 0) > VARREDURA_MP_INTERVALO_MS;
  var payload = JSON.stringify({ limiteMs: Math.round(limiteMs), varredura: varredura });

  try {
    var response = UrlFetchApp.fetch(backendUrl + CONCILIACAO_ROTA, {
      method: 'post',
      contentType: 'application/json',
      headers: _entregasSecurity.criarHeadersBackendInterno(CONCILIACAO_ROTA, payload, {
        legacyHeader: 'x-watermark-secret',
        legacySecret: props.getProperty('WATERMARK_API_SECRET') || '',
      }),
      payload: payload,
      muteHttpExceptions: true,
    });
    var codigo = response.getResponseCode();
    if (codigo !== 200) {
      var texto = String(response.getContentText() || '').slice(0, 200);
      Logger.log('Conciliacao de entregas recusada (' + codigo + '): ' + texto);
      registrarConciliacao({ quando: new Date().toISOString(), erro: 'HTTP ' + codigo + ' ' + texto });
      return { resultado: 'erro', codigo: codigo };
    }
    var dados = JSON.parse(response.getContentText());
    if (varredura) props.setProperty(VARREDURA_MP_KEY, String(Date.now()));
    registrarConciliacao({
      quando: new Date().toISOString(),
      verificados: dados.verificados || 0,
      conciliados: dados.conciliados || 0,
      entregues: dados.entregues || 0,
      reenviados: dados.reenviados || 0,
      parcial: Boolean(dados.parcial),
      resumo: dados.resumo || { erros: 0, avisos: 0 },
      problemas: _resumoProblemas(dados.problemas),
    });
    try {
      avisarProblemasEntrega(dados);
    } catch (mailError) {
      Logger.log('Falha ao avisar sobre entregas: ' + mailError.message);
    }
    return { resultado: 'ok', entregues: dados.entregues || 0, reenviados: dados.reenviados || 0 };
  } catch (error) {
    Logger.log('Falha ao conciliar entregas: ' + error.message);
    registrarConciliacao({ quando: new Date().toISOString(), erro: String(error.message).slice(0, 200) });
    return { resultado: 'erro', erro: String(error.message) };
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    CONCILIACAO_ROTA, CONCILIACAO_KEY, ALERTA_ENTREGA_KEY, VARREDURA_MP_KEY,
    conciliarEntregasBackend, avisarProblemasEntrega, registrarConciliacao,
  };
}
