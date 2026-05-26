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
  Logger.log('processarEventos: ' + new Date());

  // Propagate spreadsheet administration to sale flags before exposing photos.
  sincronizarConfiguracoesAdministrativas();

  // 1. Remove entradas cujas fotos ja foram preservadas em armazenamento privado.
  verificarEventosProntosParaRemover();

  // 2. Descobre eventos novos (subpastas)
  var novos = listarEventosNovos();
  if (novos.length === 0) {
    Logger.log('Nenhum evento novo encontrado em Fotos_Origem');
    return;
  }

  // 3. Processa um evento por vez (lock evita paralelismo)
  var evento   = novos[0];
  var metadados = interpretarNomePasta(evento.nomePasta);
  var eventoId = gerarEventoId(metadados.nomeNormalizado || evento.nomePasta);

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
      nomePasta:  metadados.nomeNormalizado || evento.nomePasta,
      folderId:   evento.folderId,
      totalFotos: arquivos.length,
      titulo: metadados.titulo,
      categoria: metadados.categoria,
      dataEvento: metadados.dataEvento,
      erro: metadados.erro,
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
    entregarFotos, verificarEventosProntosParaRemover,
  };
}
