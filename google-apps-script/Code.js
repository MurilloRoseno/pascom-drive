// Code.js — Entry points called by time-based triggers.
// All business logic lives in Drive.js, Sheet.js, Watermark.js, WhatsApp.js.

/**
 * Run once from Apps Script editor to install both triggers.
 * Safe to re-run: deletes existing triggers before creating new ones.
 */
function criarTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processarEventos').timeBased().everyMinutes(5).create();
  Logger.log('Trigger de processamento criado. A entrega agora ocorre pelo backend apos o webhook.');
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Pascom Drive')
      .addItem('Preparar estrutura segura', 'inicializarEstrutura')
      .addItem('Normalizar nomes de eventos', 'normalizarMetadadosEventos')
      .addItem('Reprocessar miniaturas pendentes', 'reprocessarMiniaturasEmLote')
      .addItem('Organizar miniaturas existentes', 'organizarMiniaturasEmPasta')
      .addSeparator()
      .addItem('Publicar evento selecionado', 'publicarEventoSelecionado')
      .addItem('Autorizar venda selecionada', 'autorizarVendaSelecionada')
      .addItem('Revogar venda selecionada', 'revogarVendaSelecionada')
      .addItem('Sincronizar venda com fotos', 'sincronizarVendaSelecionada')
      .addItem('Alternar visibilidade selecionada', 'alternarVisibilidadeSelecionada')
      .addSeparator()
      .addItem('Cadastrar taxas Mercado Pago D0', 'cadastrarRegrasMercadoPagoD0')
      .addSeparator()
      .addItem('Gerar codigo de acesso', 'gerarCodigoEventoSelecionado')
      .addItem('Revogar codigo de acesso', 'revogarCodigoEventoSelecionado')
      .addItem('Arquivar evento selecionado', 'arquivarEventoSelecionado')
      .addToUi();
  } catch (error) {
    Logger.log('Menu indisponivel em script independente. Use as colunas da aba Eventos e as funcoes administrativas.');
  }
}

/**
 * Legado — mantido para compatibilidade caso alguém chame diretamente.
 * @deprecated Use processarEventos()
 */
function processarFotosNovas() {
  Logger.log('processarFotosNovas (legado) — redirecionando para processarEventos');
  processarEventos();
}

/**
 * Trigger principal — roda a cada 5 minutos.
 * Descobre subpastas (eventos) em Fotos_Origem, processa um por vez (lock)
 * e remove a entrada quando originais privados e previews forem preservados.
 */
function processarEventos() {
  var inicioCiclo = Date.now();
  var inicio = new Date(inicioCiclo).toISOString();
  var resultado = { resultado: 'erro', evento: '', erro: '' };
  try {
    resultado = processarEventosRegistrado() || resultado;
    executarPedidosDoPainel(inicioCiclo);
    conciliarEntregasDoCiclo(inicioCiclo);
  } catch (e) {
    resultado = { resultado: 'erro', evento: '', erro: String(e && e.message || e).slice(0, 300) };
    throw e;
  } finally {
    // Registro lido pela aba Sistema do Painel Pascom (sem dados sensiveis).
    if (typeof registrarUltimaExecucao === 'function') {
      registrarUltimaExecucao({
        inicio: inicio, fim: new Date().toISOString(),
        resultado: resultado.resultado, evento: resultado.evento || '', erro: resultado.erro || '',
        restantes: resultado.restantes || 0,
      });
    }
    try {
      if (typeof verificarAlertaEspaco === 'function') verificarAlertaEspaco();
    } catch (alertaErro) {
      Logger.log('Falha ao verificar espaco do Drive: ' + alertaErro.message);
    }
  }
}

/** Pedidos lentos do Painel Pascom (ex.: trocar capa), com o tempo que sobrar do ciclo. */
function executarPedidosDoPainel(inicioCiclo) {
  if (typeof executarPedidosPendentes !== 'function') return;
  if (!acquireLock('PEDIDOS_PAINEL')) return;
  try {
    executarPedidosPendentes(inicioCiclo);
  } catch (e) {
    Logger.log('Falha ao executar pedidos do painel: ' + e.message);
  } finally {
    releaseLock();
  }
}

/**
 * Conferencia dos pagamentos e das entregas, com o tempo que sobrou do ciclo.
 * Uma falha aqui nunca derruba o processamento de fotos.
 */
function conciliarEntregasDoCiclo(inicioCiclo) {
  if (typeof conciliarEntregasBackend !== 'function') return;
  try {
    conciliarEntregasBackend(inicioCiclo);
  } catch (e) {
    Logger.log('Falha ao conciliar entregas: ' + e.message);
  }
}

function processarEventosRegistrado() {
  Logger.log('processarEventos: ' + new Date());

  // Propagate spreadsheet administration to sale flags before exposing photos.
  sincronizarConfiguracoesAdministrativas();

  // 1. Remove entradas cujas fotos ja foram preservadas em armazenamento privado.
  verificarEventosProntosParaRemover();

  // 1b. Descarta envios do Painel Pascom abandonados ha mais de 48h.
  try {
    if (typeof limparEnviosAbandonados === 'function') limparEnviosAbandonados();
  } catch (e) {
    Logger.log('Falha ao limpar envios abandonados: ' + e.message);
  }

  // 2. Descobre eventos novos (subpastas)
  var novos = listarEventosNovos();
  if (novos.length === 0) {
    Logger.log('Nenhum evento novo encontrado em Fotos_Origem');
    return { resultado: 'sem_eventos' };
  }

  // 3. Uma fatia de um evento por vez (lock evita paralelismo). A fatia para antes do
  //    limite de 6 min do Apps Script; o proximo gatilho continua com o mesmo EventoID.
  var evento = novos[0];
  var resolvido = resolverEventoDaPasta(evento);

  if (!acquireLock(resolvido.eventoId)) {
    var lock = getLockStatus();
    Logger.log('Lock ativo: ' + lock.eventoId +
      ' (iniciado há ' + Math.round((Date.now() - lock.ts) / 1000) + 's)');
    return { resultado: 'ocupado', evento: lock.eventoId };
  }

  try {
    return processarFatia(evento, resolvido.eventoId, resolvido.existente);
  } catch (e) {
    atualizarStatusEvento(resolvido.eventoId, 'Erro', { erro: String(e.message) });
    moverParaQuarentena(evento.folderId, e.message);
    Logger.log('ERRO CRÍTICO em ' + resolvido.eventoId + ': ' + e.message);
    return { resultado: 'erro', evento: resolvido.eventoId, erro: String(e.message).slice(0, 300) };
  } finally {
    releaseLock();
  }
}

/**
 * Verifica eventos cujos originais privados e previews ja foram preservados
 * e remove a pasta de entrada sem criar links permanentes de entrega.
 */
function verificarEventosProntosParaRemover() {
  var sheet = getEventosSheet();
  var data  = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var eventoIdCol = headers.indexOf('EventoID');
  var folderIdCol = headers.indexOf('FolderID');
  var statusCol = headers.indexOf('StatusProcessamento');
  var pastaRemovidaCol = headers.indexOf('PastaRemovida');
  for (var i = 1; i < data.length; i++) {
    var eventoId = data[i][eventoIdCol];
    var folderId = data[i][folderIdCol];
    var status   = data[i][statusCol];
    var removida = data[i][pastaRemovidaCol];
    if (removida === true) continue;
    if (status !== 'Processado') continue;
    if (eventoProntoParaRemover(eventoId)) {
      removerPastaEvento(eventoId, folderId);
    }
  }
}

/**
 * Legado desativado: pedidos aprovados sao entregues somente pelo backend,
 * com download temporario persistido e WhatsApp assistido pela secretaria.
 */
function entregarFotos() {
  Logger.log('entregarFotos desativado: entrega segura e executada pelo backend.');
}

if (typeof module !== 'undefined') {
  module.exports = {
    criarTriggers, onOpen, processarFotosNovas, processarEventos,
    entregarFotos, verificarEventosProntosParaRemover, conciliarEntregasDoCiclo,
  };
}
