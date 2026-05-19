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
  ScriptApp.newTrigger('entregarFotos').timeBased().everyMinutes(1).create();
  Logger.log('Triggers criados com sucesso.');
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
 * Descobre subpastas (eventos) em Fotos_Origem, processa um por vez (lock),
 * remove pasta quando 100% das fotos forem entregues.
 */
function processarEventos() {
  Logger.log('processarEventos: ' + new Date());

  // 1. Verifica se há eventos prontos para remoção segura (de rodadas anteriores)
  verificarEventosProntosParaRemover();

  // 2. Descobre eventos novos (subpastas)
  var novos = listarEventosNovos();
  if (novos.length === 0) {
    Logger.log('Nenhum evento novo encontrado em Fotos_Origem');
    return;
  }

  // 3. Processa um evento por vez (lock evita paralelismo)
  var evento   = novos[0];
  var eventoId = gerarEventoId(evento.nomePasta);

  if (!acquireLock(eventoId)) {
    var lock = getLockStatus();
    Logger.log('Lock ativo: ' + lock.eventoId +
      ' (iniciado há ' + Math.round((Date.now() - lock.ts) / 1000) + 's)');
    return;
  }

  try {
    // Registra antes de mudar status (garante linha existente para atualizarStatusEvento)
    var arquivos = listarArquivosDoEvento(evento.folderId);
    registrarEvento({
      eventoId:   eventoId,
      nomePasta:  evento.nomePasta,
      folderId:   evento.folderId,
      totalFotos: arquivos.length,
    });

    Logger.log('Iniciando: ' + eventoId + ' (' + arquivos.length + ' fotos)');
    atualizarStatusEvento(eventoId, 'Processando', { dataInicio: new Date().toISOString() });

    var erros = [];
    for (var i = 0; i < arquivos.length; i++) {
      try {
        processarFoto(arquivos[i], eventoId, i + 1);
        atualizarStatusEvento(eventoId, 'Processando', { fotosProcessadas: i + 1 });
      } catch (e) {
        erros.push('Foto ' + (i + 1) + ' (' + arquivos[i].getName() + '): ' + e.message);
        Logger.log('Erro foto ' + arquivos[i].getName() + ': ' + e.message);
      }
    }

    if (erros.length === 0) {
      // Remove a subpasta vazia de Fotos_Origem imediatamente após processar todas as fotos
      DriveApp.getFolderById(evento.folderId).setTrashed(true);
      atualizarStatusEvento(eventoId, 'Processado', {
        dataConclusao: new Date().toISOString(),
        pastaRemovida: true,
      });
      Logger.log('Evento processado e pasta removida: ' + eventoId);
    } else {
      atualizarStatusEvento(eventoId, 'Erro', { erro: JSON.stringify(erros) });
      moverParaQuarentena(evento.folderId, erros.join('; '));
      Logger.log('Evento com erros em quarentena: ' + eventoId);
    }

  } catch (e) {
    atualizarStatusEvento(eventoId, 'Erro', { erro: e.message });
    moverParaQuarentena(evento.folderId, e.message);
    Logger.log('ERRO CRÍTICO em ' + eventoId + ': ' + e.message);
  } finally {
    releaseLock();
  }
}

/**
 * Verifica eventos com status Processado que já tiveram todas as fotos entregues
 * e remove a pasta de origem com segurança.
 */
function verificarEventosProntosParaRemover() {
  var sheet = getEventosSheet();
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var eventoId = data[i][0];
    var folderId = data[i][2];
    var status   = data[i][3];
    var removida = data[i][11];
    if (removida === true) continue;
    if (status !== 'Processado') continue;
    if (eventoProntoParaRemover(eventoId)) {
      removerPastaEvento(eventoId, folderId);
    }
  }
}

/**
 * Called every 1 minute.
 * Finds rows with "Pagamento Confirmado" and generates wa.me delivery links.
 */
function entregarFotos() {
  Logger.log('entregarFotos: ' + new Date());
  processarEntregas();
}

if (typeof module !== 'undefined') {
  module.exports = { criarTriggers, processarFotosNovas, processarEventos, entregarFotos, verificarEventosProntosParaRemover };
}
