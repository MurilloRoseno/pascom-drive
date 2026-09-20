// Processamento.js — Processamento de eventos em fatias retomaveis, quarentena por foto
// e pedidos do Painel Pascom (reprocessar, descartar falhas, trocar capa).
// Uma execucao do Apps Script dura no maximo 6 minutos: cada fatia para antes disso e o
// gatilho de 5 minutos continua de onde parou, sempre com o mesmo EventoID da pasta.
// Dependencias globais (Apps Script): DriveApp, PropertiesService, LockService, Logger.

/* global DriveApp, PropertiesService, LockService, Logger */

var PROCESSAMENTO_ORCAMENTO_MS = 270000;
var PEDIDOS_ORCAMENTO_MINIMO_MS = 60000;
var CICLO_LIMITE_MS = 330000;
var FALHAS_PASTA = '_FALHAS';
var MAX_TENTATIVAS_FOTO = 3;
var PROGRESSO_A_CADA = 5;
var MAX_ERROS_GUARDADOS = 20;
var PEDIDOS_PROCESSAMENTO_HEADERS = ['PedidoID', 'Quando', 'Quem', 'Tipo', 'EventoID', 'Alvo', 'Status', 'Detalhe', 'ConcluidoEm'];

function _procDeps() {
  if (typeof module !== 'undefined' && typeof require !== 'undefined') {
    var modulos = {
      queue: require('./EventQueue'),
      drive: require('./Drive'),
      sheet: require('./Sheet'),
      watermark: require('./Watermark'),
      upload: require('./Upload'),
      admin: require('./EventAdmin'),
    };
    var pick = function (modulo, nome) {
      return function () { return (global[nome] || modulos[modulo][nome]).apply(this, arguments); };
    };
    return {
      interpretarNomePasta: pick('queue', 'interpretarNomePasta'),
      gerarEventoId: pick('queue', 'gerarEventoId'),
      listarArquivosDoEvento: pick('drive', 'listarArquivosDoEvento'),
      moverParaQuarentena: pick('drive', 'moverParaQuarentena'),
      getSourceFolder: pick('drive', 'getSourceFolder'),
      getAmostrasFolder: pick('drive', 'getAmostrasFolder'),
      getThumbnailsFolder: pick('drive', 'getThumbnailsFolder'),
      trashFileById: pick('drive', 'trashFileById'),
      registrarEvento: pick('sheet', 'registrarEvento'),
      atualizarStatusEvento: pick('sheet', 'atualizarStatusEvento'),
      getStatusEventoByFolderId: pick('sheet', 'getStatusEventoByFolderId'),
      getEventoPorId: pick('sheet', 'getEventoPorId'),
      erroRegraEvento: pick('sheet', 'erroRegraEvento'),
      setField: pick('sheet', 'setField'),
      getSheet: pick('sheet', 'getSheet'),
      ensureSheet: pick('sheet', 'ensureSheet'),
      appendMappedRow: pick('sheet', 'appendMappedRow'),
      invalidarCacheSite: pick('sheet', 'invalidarCacheSite'),
      processarFoto: pick('watermark', 'processarFoto'),
      solicitarDerivado: pick('watermark', 'solicitarDerivado'),
      salvarDerivado: pick('watermark', 'salvarDerivado'),
      montarNomePastaEvento: pick('upload', 'montarNomePastaEvento'),
      eventoJaExiste: pick('upload', 'eventoJaExiste'),
      registrarAuditoriaPascom: pick('admin', 'registrarAuditoriaPascom'),
    };
  }
  /* eslint-disable no-undef */
  return {
    interpretarNomePasta: interpretarNomePasta,
    gerarEventoId: gerarEventoId,
    listarArquivosDoEvento: listarArquivosDoEvento,
    moverParaQuarentena: moverParaQuarentena,
    getSourceFolder: getSourceFolder,
    getAmostrasFolder: getAmostrasFolder,
    getThumbnailsFolder: getThumbnailsFolder,
    trashFileById: trashFileById,
    registrarEvento: registrarEvento,
    atualizarStatusEvento: atualizarStatusEvento,
    getStatusEventoByFolderId: getStatusEventoByFolderId,
    getEventoPorId: getEventoPorId,
    erroRegraEvento: erroRegraEvento,
    setField: setField,
    getSheet: getSheet,
    ensureSheet: ensureSheet,
    appendMappedRow: appendMappedRow,
    invalidarCacheSite: invalidarCacheSite,
    processarFoto: processarFoto,
    solicitarDerivado: solicitarDerivado,
    salvarDerivado: salvarDerivado,
    montarNomePastaEvento: montarNomePastaEvento,
    eventoJaExiste: eventoJaExiste,
    registrarAuditoriaPascom: registrarAuditoriaPascom,
  };
  /* eslint-enable no-undef */
}

function _erroProc(codigo, mensagem) {
  var error = new Error(mensagem);
  error.codigo = codigo;
  return error;
}

function _linhasComoObjetos(sheet) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0] || [];
  var linhas = [];
  for (var i = 1; i < values.length; i++) {
    var item = { _rowNumber: i + 1 };
    headers.forEach(function (header, index) { item[header] = values[i][index]; });
    linhas.push(item);
  }
  return linhas;
}

// ─── Tentativas por arquivo (guardadas na descricao do proprio arquivo) ──────

function tentativasArquivo(arquivo) {
  var match = /pascom:tentativas=(\d+)/.exec(String(arquivo.getDescription ? arquivo.getDescription() || '' : ''));
  return match ? Number(match[1]) : 0;
}

function _definirTentativas(arquivo, n) {
  if (arquivo.setDescription) arquivo.setDescription(n > 0 ? 'pascom:tentativas=' + n : '');
}

function _subpasta(pasta, nome, criar) {
  var existentes = pasta.getFoldersByName(nome);
  if (existentes.hasNext()) return existentes.next();
  return criar ? pasta.createFolder(nome) : null;
}

function _contarArquivos(pasta) {
  if (!pasta) return 0;
  var total = 0;
  var iterator = pasta.getFiles();
  while (iterator.hasNext()) { iterator.next(); total += 1; }
  return total;
}

function _errosDoEvento(item) {
  var texto = String((item && item.Erros) || '');
  if (!texto) return [];
  try {
    var lista = JSON.parse(texto);
    return Array.isArray(lista) ? lista.map(String) : [texto];
  } catch (error) {
    return [texto];
  }
}

// ─── Fatia de processamento ──────────────────────────────────────────────────

/**
 * Resolve o EventoID da pasta: reaproveita a linha existente (mesmo FolderID) para
 * retomadas e voltas da quarentena; so gera um ID novo para pasta nunca vista.
 */
function resolverEventoDaPasta(evento) {
  var deps = _procDeps();
  var existente = deps.getStatusEventoByFolderId(evento.folderId);
  if (existente && existente.eventoId) return { eventoId: existente.eventoId, existente: existente };
  var metadados = deps.interpretarNomePasta(evento.nomePasta);
  return { eventoId: deps.gerarEventoId(metadados.nomeNormalizado || evento.nomePasta), existente: null };
}

function _ordenarPorNome(arquivos) {
  return arquivos.slice().sort(function (a, b) {
    var x = a.getName();
    var y = b.getName();
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

/**
 * Processa ate `orcamentoMs` de fotos da pasta. Nao duplica foto ja registrada
 * (ArquivoOrigemID) e manda para _FALHAS a foto que falha MAX_TENTATIVAS_FOTO vezes.
 */
function processarFatia(evento, eventoId, existente, opcoes) {
  var deps = _procDeps();
  var inicio = Date.now();
  var orcamento = (opcoes && opcoes.orcamentoMs) || PROCESSAMENTO_ORCAMENTO_MS;
  var metadados = deps.interpretarNomePasta(evento.nomePasta);
  var arquivos = _ordenarPorNome(deps.listarArquivosDoEvento(evento.folderId));

  if (!existente) {
    if (!arquivos.length) {
      Logger.log('Pasta preservada sem processamento: o evento ainda nao recebeu fotos (' + evento.nomePasta + ').');
      return { resultado: 'sem_eventos' };
    }
    deps.registrarEvento({
      eventoId: eventoId,
      nomePasta: metadados.nomeNormalizado || evento.nomePasta,
      folderId: evento.folderId,
      totalFotos: arquivos.length,
      titulo: metadados.titulo,
      categoria: metadados.categoria,
      dataEvento: metadados.dataEvento,
      erro: metadados.erro,
    });
  }

  // Fotos ja registradas deste evento: evita duplicar quando a execucao anterior
  // morreu entre gravar a linha e mandar o arquivo de origem para a lixeira.
  var registradas = {};
  var contagem = 0;
  _linhasComoObjetos(deps.getSheet()).forEach(function (foto) {
    if (foto.EventoID !== eventoId) return;
    if (foto.StatusProcessamento === 'Processada') contagem += 1;
    if (foto.ArquivoOrigemID) registradas[foto.ArquivoOrigemID] = true;
  });

  var extraInicio = { fotosProcessadas: contagem };
  if (!existente || existente.status === 'Pendente') extraInicio.dataInicio = new Date().toISOString();
  deps.atualizarStatusEvento(eventoId, 'Processando', extraInicio);

  var pasta = DriveApp.getFolderById(evento.folderId);
  var novasFalhas = [];
  var nestaFatia = 0;
  var terminouNoTempo = true;

  for (var i = 0; i < arquivos.length; i++) {
    if (Date.now() - inicio > orcamento) { terminouNoTempo = false; break; }
    var arquivo = arquivos[i];
    if (registradas[arquivo.getId()]) {
      arquivo.setTrashed(true);
      continue;
    }
    try {
      deps.processarFoto(arquivo, eventoId, contagem + 1);
      contagem += 1;
      nestaFatia += 1;
      if (nestaFatia % PROGRESSO_A_CADA === 0) {
        deps.atualizarStatusEvento(eventoId, 'Processando', { fotosProcessadas: contagem });
      }
    } catch (e) {
      var tentativas = tentativasArquivo(arquivo) + 1;
      _definirTentativas(arquivo, tentativas);
      Logger.log('Falha ' + tentativas + '/' + MAX_TENTATIVAS_FOTO + ' em ' + arquivo.getName() + ': ' + e.message);
      if (tentativas >= MAX_TENTATIVAS_FOTO) {
        arquivo.moveTo(_subpasta(pasta, FALHAS_PASTA, true));
        novasFalhas.push('Foto (' + arquivo.getName() + '): ' + String(e.message).slice(0, 200));
      }
    }
  }

  var restantes = deps.listarArquivosDoEvento(evento.folderId).length;
  var falhas = _contarArquivos(_subpasta(pasta, FALHAS_PASTA, false));
  var extra = { fotosProcessadas: contagem, totalFotos: contagem + restantes + falhas };
  if (novasFalhas.length) {
    var anterior = existente ? _errosDoEvento(deps.getEventoPorId(eventoId).item) : [];
    extra.erro = JSON.stringify(anterior.concat(novasFalhas).slice(-MAX_ERROS_GUARDADOS));
  }

  if (restantes > 0) {
    deps.atualizarStatusEvento(eventoId, 'Processando', extra);
    Logger.log('Fatia de ' + eventoId + ': ' + nestaFatia + ' foto(s); faltam ' + restantes + (terminouNoTempo ? ' (a tentar de novo)' : ' (tempo esgotado)'));
    return { resultado: 'parcial', evento: eventoId, restantes: restantes };
  }
  if (falhas > 0) {
    deps.atualizarStatusEvento(eventoId, 'Erro', extra);
    deps.moverParaQuarentena(evento.folderId, falhas + ' foto(s) com falha');
    return { resultado: 'erro', evento: eventoId, erro: falhas + ' foto(s) com falha' };
  }
  pasta.setTrashed(true);
  extra.dataConclusao = new Date().toISOString();
  extra.pastaRemovida = true;
  deps.atualizarStatusEvento(eventoId, 'Processado', extra);
  Logger.log('Evento processado e pasta removida: ' + eventoId);
  return { resultado: 'ok', evento: eventoId };
}

// ─── Quarentena: reprocessar, corrigir nome, descartar falhas ────────────────

function _pastaNaEntrada(folderId, exigirQuarentena) {
  var pasta;
  try {
    pasta = DriveApp.getFolderById(folderId);
  } catch (error) {
    throw _erroProc('evento_nao_encontrado', 'Pasta nao encontrada no Drive.');
  }
  if (pasta.isTrashed()) throw _erroProc('evento_nao_encontrado', 'A pasta esta na lixeira do Drive.');
  var sourceId = _procDeps().getSourceFolder().getId();
  var parents = pasta.getParents();
  var naEntrada = false;
  while (parents.hasNext()) { if (parents.next().getId() === sourceId) naEntrada = true; }
  if (!naEntrada) throw _erroProc('evento_nao_encontrado', 'A pasta nao esta em Fotos_Origem.');
  if (exigirQuarentena && !/^_(ERRO|QUARANTINE)_/.test(pasta.getName())) {
    throw _erroProc('regra_negocio', 'A pasta nao esta em quarentena.');
  }
  return pasta;
}

/** Devolve as fotos de _FALHAS com as tentativas zeradas e tira o prefixo de quarentena. */
function reprocessarPastaQuarentena(pasta) {
  var deps = _procDeps();
  var devolvidas = 0;
  var falhas = _subpasta(pasta, FALHAS_PASTA, false);
  if (falhas) {
    var iterator = falhas.getFiles();
    while (iterator.hasNext()) {
      var arquivo = iterator.next();
      _definirTentativas(arquivo, 0);
      arquivo.moveTo(pasta);
      devolvidas += 1;
    }
    falhas.setTrashed(true);
  }
  var restantes = pasta.getFiles();
  while (restantes.hasNext()) _definirTentativas(restantes.next(), 0);
  var nome = deps.interpretarNomePasta(pasta.getName()).nomeNormalizado;
  pasta.setName(nome);
  var existente = deps.getStatusEventoByFolderId(pasta.getId());
  if (existente && existente.eventoId) {
    deps.atualizarStatusEvento(existente.eventoId, 'Pendente', { erro: '' });
  }
  return { nomePasta: nome, devolvidas: devolvidas, eventoId: existente ? existente.eventoId : '' };
}

function _pastaDoEvento(eventoId) {
  var selected = _procDeps().getEventoPorId(eventoId);
  if (String(selected.item.StatusProcessamento || '') !== 'Erro') {
    throw _procDeps().erroRegraEvento('So eventos com fotos que falharam podem ser reprocessados.');
  }
  return { selected: selected, pasta: _pastaNaEntrada(selected.item.FolderID, false) };
}

function reprocessarEvento(eventoId) {
  return reprocessarPastaQuarentena(_pastaDoEvento(eventoId).pasta);
}

/** Desiste das fotos que falharam: vao para a lixeira e o evento e concluido com o que deu certo. */
function descartarFalhasEvento(eventoId) {
  var deps = _procDeps();
  var alvo = _pastaDoEvento(eventoId);
  var falhas = _subpasta(alvo.pasta, FALHAS_PASTA, false);
  var descartadas = _contarArquivos(falhas);
  if (falhas) falhas.setTrashed(true);
  if (_contarArquivos(alvo.pasta) > 0) {
    // Ainda ha fotos que nunca foram tentadas: volta para a fila.
    alvo.pasta.setName(deps.interpretarNomePasta(alvo.pasta.getName()).nomeNormalizado);
    deps.atualizarStatusEvento(eventoId, 'Pendente', { erro: '' });
    return { descartadas: descartadas, situacao: 'na_fila' };
  }
  alvo.pasta.setTrashed(true);
  deps.atualizarStatusEvento(eventoId, 'Processado', {
    erro: '', dataConclusao: new Date().toISOString(), pastaRemovida: true,
    totalFotos: Number(alvo.selected.item.FotosProcessadas) || 0,
  });
  deps.invalidarCacheSite(eventoId);
  return { descartadas: descartadas, situacao: 'concluido' };
}

function corrigirNomePastaQuarentena(folderId, dados) {
  var deps = _procDeps();
  var pasta = _pastaNaEntrada(folderId, true);
  var nome = deps.montarNomePastaEvento(dados);
  var existente = deps.getStatusEventoByFolderId(folderId);
  if (!existente && deps.eventoJaExiste(nome, deps.getSourceFolder())) {
    throw _erroProc('evento_duplicado', 'Ja existe um evento com esta categoria, data e titulo.');
  }
  pasta.setName(nome);
  var resultado = reprocessarPastaQuarentena(pasta);
  return { nomePasta: nome, devolvidas: resultado.devolvidas, eventoId: resultado.eventoId };
}

// ─── Pedidos lentos (executados pelo gatilho): trocar capa ───────────────────

function _pedidosSheet() {
  return _procDeps().ensureSheet('PedidosProcessamento', PEDIDOS_PROCESSAMENTO_HEADERS);
}

function pedidoPendenteDoEvento(eventoId) {
  var pendente = null;
  _linhasComoObjetos(_pedidosSheet()).forEach(function (pedido) {
    if (pedido.EventoID === eventoId && (pedido.Status === 'pendente' || pedido.Status === 'executando')) pendente = pedido;
  });
  return pendente;
}

function enfileirarTrocaCapa(eventoId, fotoId, quem) {
  var deps = _procDeps();
  var selected = deps.getEventoPorId(eventoId);
  var status = String(selected.item.StatusProcessamento || '');
  if (status === 'Pendente' || status === 'Processando') {
    throw deps.erroRegraEvento('Aguarde o processamento terminar para trocar a capa.');
  }
  if (selected.item.EspacoLiberacao) {
    throw deps.erroRegraEvento('Os arquivos deste evento foram removidos para liberar espaco.');
  }
  if (pedidoPendenteDoEvento(eventoId)) {
    throw deps.erroRegraEvento('Ja existe uma troca de capa na fila para este evento.');
  }
  var foto = null;
  _linhasComoObjetos(deps.getSheet()).forEach(function (linha) {
    if (linha.FotoID === fotoId && linha.EventoID === eventoId) foto = linha;
  });
  if (!foto || foto.StatusProcessamento !== 'Processada' || foto.ArquivosLiberados === 'SIM') {
    throw deps.erroRegraEvento('Foto nao encontrada neste evento.');
  }
  if (foto.TipoFoto === 'capa') throw deps.erroRegraEvento('Esta foto ja e a capa.');
  if (!foto.OriginalFileID) throw deps.erroRegraEvento('Foto sem original guardado; nao pode virar capa.');
  var pedidoId = 'PP_' + Date.now();
  deps.appendMappedRow(_pedidosSheet(), {
    PedidoID: pedidoId, Quando: new Date().toISOString(), Quem: quem || '', Tipo: 'trocarCapa',
    EventoID: eventoId, Alvo: fotoId, Status: 'pendente',
  });
  return { pedidoId: pedidoId, situacao: 'na_fila' };
}

function _gerarDerivados(originalId, semMarca, eventoId, fotoId, nomeBase) {
  var deps = _procDeps();
  var props = PropertiesService.getScriptProperties();
  var backendUrl = props.getProperty('BACKEND_URL');
  var legacySecret = props.getProperty('WATERMARK_API_SECRET') || '';
  var semente = eventoId + ':' + fotoId + ':';
  var preview = deps.solicitarDerivado(originalId, semMarca, 'preview', backendUrl, legacySecret, semente + 'preview');
  var thumbnail = deps.solicitarDerivado(originalId, semMarca, 'thumbnail', backendUrl, legacySecret, semente + 'thumbnail');
  var previewFile = deps.salvarDerivado(preview, nomeBase, deps.getAmostrasFolder());
  var thumbnailFile = deps.salvarDerivado(thumbnail, '[THUMB]' + nomeBase, deps.getThumbnailsFolder());
  return { previewId: previewFile.getId(), thumbnailId: thumbnailFile.getId() };
}

/**
 * A foto escolhida vira capa (derivados sem marca, fora da venda) e a capa antiga vira
 * foto comum (derivados com marca, venda conforme o evento). Os derivados antigos so
 * vao para a lixeira depois que os novos estao gravados.
 */
function executarTrocaCapa(eventoId, fotoId) {
  var deps = _procDeps();
  var selected = deps.getEventoPorId(eventoId);
  var sheet = deps.getSheet();
  var linhas = _linhasComoObjetos(sheet);
  var nova = null;
  var antigas = [];
  linhas.forEach(function (linha) {
    if (linha.EventoID !== eventoId) return;
    if (linha.FotoID === fotoId) nova = linha;
    else if (linha.TipoFoto === 'capa' && linha.StatusProcessamento === 'Processada') antigas.push(linha);
  });
  if (!nova || !nova.OriginalFileID) throw deps.erroRegraEvento('Foto nao encontrada para virar capa.');

  var derivadosCapa = _gerarDerivados(nova.OriginalFileID, true, eventoId, fotoId, '[CAPA]' + eventoId + '_' + fotoId + '.jpg');
  var derivadosAntigas = antigas.filter(function (antiga) { return antiga.OriginalFileID; }).map(function (antiga) {
    return {
      linha: antiga,
      derivados: _gerarDerivados(antiga.OriginalFileID, false, eventoId, antiga.FotoID, '[AMOSTRA]' + eventoId + '_' + antiga.FotoID + '.jpg'),
    };
  });

  var lixo = [nova.PreviewFileID, nova.ThumbnailFileID];
  deps.setField(sheet, nova._rowNumber, 'TipoFoto', 'capa');
  deps.setField(sheet, nova._rowNumber, 'DisponivelVenda', 'NAO');
  deps.setField(sheet, nova._rowNumber, 'PreviewFileID', derivadosCapa.previewId);
  deps.setField(sheet, nova._rowNumber, 'ThumbnailFileID', derivadosCapa.thumbnailId);
  var venda = selected.item.VendaAutorizada === 'SIM' ? 'SIM' : 'NAO';
  derivadosAntigas.forEach(function (entrada) {
    lixo.push(entrada.linha.PreviewFileID, entrada.linha.ThumbnailFileID);
    deps.setField(sheet, entrada.linha._rowNumber, 'TipoFoto', 'foto');
    deps.setField(sheet, entrada.linha._rowNumber, 'DisponivelVenda', venda);
    deps.setField(sheet, entrada.linha._rowNumber, 'PreviewFileID', entrada.derivados.previewId);
    deps.setField(sheet, entrada.linha._rowNumber, 'ThumbnailFileID', entrada.derivados.thumbnailId);
  });
  lixo.filter(Boolean).forEach(function (id) {
    try { deps.trashFileById(id); } catch (error) { Logger.log('Derivado antigo indisponivel (' + id + '): ' + error.message); }
  });
  deps.invalidarCacheSite(eventoId);
  return { capa: fotoId, antigas: derivadosAntigas.length };
}

/** Executa pedidos pendentes do painel enquanto houver tempo no ciclo do gatilho. */
function executarPedidosPendentes(inicioCiclo) {
  var inicio = inicioCiclo || Date.now();
  var sheet = _pedidosSheet();
  var deps = _procDeps();
  var executados = 0;
  var pedidos = _linhasComoObjetos(sheet).filter(function (pedido) { return pedido.Status === 'pendente'; });
  for (var i = 0; i < pedidos.length; i++) {
    if (CICLO_LIMITE_MS - (Date.now() - inicio) < PEDIDOS_ORCAMENTO_MINIMO_MS) break;
    var pedido = pedidos[i];
    deps.setField(sheet, pedido._rowNumber, 'Status', 'executando');
    try {
      if (pedido.Tipo !== 'trocarCapa') throw new Error('Tipo de pedido desconhecido: ' + pedido.Tipo);
      var resultado = executarTrocaCapa(pedido.EventoID, pedido.Alvo);
      deps.setField(sheet, pedido._rowNumber, 'Status', 'concluido');
      deps.setField(sheet, pedido._rowNumber, 'Detalhe', 'capa: ' + resultado.capa);
      deps.registrarAuditoriaPascom('trocarCapa', { eventoId: pedido.EventoID, quem: pedido.Quem }, 'capa: ' + resultado.capa);
    } catch (error) {
      deps.setField(sheet, pedido._rowNumber, 'Status', 'erro');
      deps.setField(sheet, pedido._rowNumber, 'Detalhe', String(error.message).slice(0, 300));
      Logger.log('Pedido ' + pedido.PedidoID + ' falhou: ' + error.message);
    }
    deps.setField(sheet, pedido._rowNumber, 'ConcluidoEm', new Date().toISOString());
    executados += 1;
  }
  return executados;
}

// ─── Acoes do Web App sobre pastas em quarentena (sem EventoID) ──────────────

function _executarAcaoPasta(nome, payload, executar) {
  if (!payload || !/^[A-Za-z0-9_-]{10,120}$/.test(String(payload.folderId || ''))) {
    throw _erroProc('dados_invalidos', 'Pasta invalida.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var resultado = executar() || {};
    _procDeps().registrarAuditoriaPascom(nome, { eventoId: resultado.eventoId || '', quem: payload.quem },
      'pasta: ' + (resultado.nomePasta || payload.folderId));
    return resultado;
  } finally {
    lock.releaseLock();
  }
}

var PASTA_ACOES = {
  reprocessarPasta: function (p) {
    return _executarAcaoPasta('reprocessarPasta', p, function () {
      return reprocessarPastaQuarentena(_pastaNaEntrada(p.folderId, true));
    });
  },
  corrigirNomePasta: function (p) {
    return _executarAcaoPasta('corrigirNomePasta', p, function () {
      return corrigirNomePastaQuarentena(p.folderId, { categoria: p.categoria, data: p.data, titulo: p.titulo });
    });
  },
};

if (typeof module !== 'undefined') {
  module.exports = {
    FALHAS_PASTA, MAX_TENTATIVAS_FOTO, PEDIDOS_PROCESSAMENTO_HEADERS, PASTA_ACOES,
    resolverEventoDaPasta, processarFatia, tentativasArquivo, reprocessarPastaQuarentena, reprocessarEvento,
    descartarFalhasEvento, corrigirNomePastaQuarentena, enfileirarTrocaCapa, executarTrocaCapa,
    executarPedidosPendentes, pedidoPendenteDoEvento,
  };
}
