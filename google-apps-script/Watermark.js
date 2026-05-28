// Watermark.js — Photo processing: copy original, apply watermark via backend, register.
// "Watermark" = pixel-level PNG overlay applied by calling POST /api/watermark on the backend.
//
// Architecture note:
//   The backend returns raw JPEG bytes (not a Drive link) to avoid the
//   "Service Accounts do not have storage quota" limitation. Apps Script
//   saves the blob directly to Drive as the authenticated user (who has quota).

/* global copyFileToFolder, trashFileById, moveFileToFolderIfNeeded, getShareableLink, getOriginaisFolder, getAmostrasFolder, getThumbnailsFolder,
          registrarFoto, atualizarDerivadosFoto, listarFotosParaReprocessar, listarFotosComMiniatura, invalidarCacheSite,
          UrlFetchApp, PropertiesService, MailApp, Logger */

var PRECO_PADRAO = 10;
var _idCounter = 0;

// In Node/Jest context, pull helpers from their modules so jest.mock() intercepts them.
var _helpers = (function () {
  if (typeof module !== 'undefined' && typeof require !== 'undefined') {
    var drive = require('./Drive');
    var sheet = require('./Sheet');
    return {
      copyFileToFolder:  drive.copyFileToFolder,
      getShareableLink:  drive.getShareableLink,
      getOriginaisFolder: drive.getOriginaisFolder,
      getAmostrasFolder:  drive.getAmostrasFolder,
      getThumbnailsFolder: drive.getThumbnailsFolder,
      trashFileById:      drive.trashFileById,
      moveFileToFolderIfNeeded: drive.moveFileToFolderIfNeeded,
      registrarFoto:     sheet.registrarFoto,
      atualizarDerivadosFoto: sheet.atualizarDerivadosFoto,
      listarFotosParaReprocessar: sheet.listarFotosParaReprocessar,
      listarFotosComMiniatura: sheet.listarFotosComMiniatura,
      invalidarCacheSite: sheet.invalidarCacheSite,
    };
  }
  // In Apps Script context, these are global functions injected by the runtime.
  return {
    copyFileToFolder:  function () { return copyFileToFolder.apply(this, arguments); },
    getShareableLink:  function () { return getShareableLink.apply(this, arguments); },
    getOriginaisFolder: function () { return getOriginaisFolder.apply(this, arguments); },
    getAmostrasFolder:  function () { return getAmostrasFolder.apply(this, arguments); },
    getThumbnailsFolder: function () { return getThumbnailsFolder.apply(this, arguments); },
    trashFileById:      function () { return trashFileById.apply(this, arguments); },
    moveFileToFolderIfNeeded: function () { return moveFileToFolderIfNeeded.apply(this, arguments); },
    registrarFoto:     function () { return registrarFoto.apply(this, arguments); },
    atualizarDerivadosFoto: function () { return atualizarDerivadosFoto.apply(this, arguments); },
    listarFotosParaReprocessar: function () { return listarFotosParaReprocessar.apply(this, arguments); },
    listarFotosComMiniatura: function () { return listarFotosComMiniatura.apply(this, arguments); },
    invalidarCacheSite: function () { return invalidarCacheSite.apply(this, arguments); },
  };
}());

function gerarIdFoto() {
  _idCounter += 1;
  return 'FOTO_' + new Date().getTime() + _idCounter;
}

function gerarNomeAmostra(nome) {
  return '[AMOSTRA]' + nome;
}

function ehArquivoCapa(nome) {
  return /^capa(?:\.[^.]+)?$/i.test(String(nome || '').trim());
}

/**
 * Call /api/preprocess to convert format + compress.
 * Returns parsed JSON body on success, null if unsupported format (422 → skip silently).
 * Throws on any other non-2xx status.
 * @param {GoogleAppsScript.Drive.File} arquivo
 * @param {string} backendUrl
 * @param {Object} headers
 * @returns {Object|null}
 */
function _preprocessarArquivo(arquivo, backendUrl, headers) {
  var payload = JSON.stringify({ fileId: arquivo.getId() });
  var response = UrlFetchApp.fetch(backendUrl + '/api/preprocess', {
    method:             'POST',
    headers:            headers,
    payload:            payload,
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  if (code === 422) {
    Logger.log('Formato não suportado para pre-processamento: ' + arquivo.getName() + ' — continuando sem converter.');
    return null;
  }
  if (code !== 200) {
    throw new Error('Preprocess API falhou (' + code + '): ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

/**
 * Process a photo: copy original → ORIGINAIS, apply watermark via backend,
 * save returned JPEG blob → AMOSTRAS (as the authenticated user, who has Drive quota),
 * move source file out of SOURCE folder, register in Sheet.
 * On any failure: attempts an admin email and leaves source file untouched for retry.
 * @param {GoogleAppsScript.Drive.File} arquivo
 * @param {string} [eventoId] - ID do evento (multi-event). Se omitido, lê do parent folder.
 * @param {number} [counter]  - Número sequencial para nomear o arquivo de saída.
 */
function notificarErroProcessamento(arquivo, erro) {
  var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!adminEmail) return;
  try {
    MailApp.sendEmail(
      adminEmail,
      '[Pascom] Erro ao processar foto: ' + arquivo.getName(),
      'Erro: ' + erro.message
    );
  } catch (mailError) {
    Logger.log('Aviso por e-mail nao enviado: ' + mailError.message);
  }
}

function solicitarDerivado(fileId, capa, variant, backendUrl, headers, watermarkSeed) {
  var response = UrlFetchApp.fetch(backendUrl + (capa ? '/api/cover-preview' : '/api/watermark'), {
    method: 'POST',
    headers: headers,
    payload: JSON.stringify({
      fileId: fileId,
      watermarkType: 'auto',
      variant: variant,
      watermarkSeed: watermarkSeed || fileId,
    }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Preview API falhou (' + response.getResponseCode() + '): ' + response.getContentText());
  }
  return response.getBlob();
}

function salvarDerivado(blob, nome, folder) {
  blob.setName(nome);
  return folder.createFile(blob);
}

function processarFoto(arquivo, eventoId, counter) {
  var copiaOriginal = null;
  var amostraFile = null;
  var thumbnailFile = null;
  var persistido = false;
  try {
    var id = gerarIdFoto();
    var nomeOriginal = arquivo.getName();
    var capa = ehArquivoCapa(nomeOriginal);
    // Quando chamado pelo orquestrador multi-evento, eventoId já vem como parâmetro.
    // Fallback para comportamento legado (pasta pai) se não for passado.
    var evento = eventoId || (arquivo.getParents().hasNext()
      ? arquivo.getParents().next().getName()
      : 'Sem_Evento');

    // Props/URL/headers needed by both preprocess and watermark
    var props      = PropertiesService.getScriptProperties();
    var backendUrl = props.getProperty('BACKEND_URL');
    var headers    = {
      'Content-Type': 'application/json',
      'x-watermark-secret': props.getProperty('WATERMARK_API_SECRET') || '',
    };

    // 0. Copy TRUE original to ORIGINAIS before any modification (backup first)
    copiaOriginal = _helpers.copyFileToFolder(arquivo, _helpers.getOriginaisFolder(), id + '_' + nomeOriginal);
    var originalFileId = copiaOriginal.getId();

    // 1. Pre-process: convert format (HEIC→JPEG, etc.) + compress in-place on Drive
    _preprocessarArquivo(arquivo, backendUrl, headers);

    // 2. Call backend to apply watermark — returns raw JPEG bytes
    var previewBlob = solicitarDerivado(arquivo.getId(), capa, 'preview', backendUrl, headers, evento + ':' + id + ':preview');
    var thumbnailBlob = solicitarDerivado(arquivo.getId(), capa, 'thumbnail', backendUrl, headers, evento + ':' + id + ':thumbnail');

    // 3. Save the returned JPEG blob to AMOSTRAS folder as the authenticated user
    //    (service account has no Drive quota, but Apps Script runs as the user who does)
    //    Always use .jpg extension — backend always returns JPEG regardless of input format.
    //    Multi-event: se tiver eventoId e counter, usa nomenclatura padronizada.
    var nomeAmostra = capa && eventoId
      ? '[CAPA]' + eventoId + '.jpg'
      : (eventoId && counter)
      ? gerarNomeAmostra(eventoId + '_' + String(counter).padStart(4, '0') + '.jpg')
      : gerarNomeAmostra(id + '_' + nomeOriginal.replace(/\.[^.]+$/, '.jpg'));
    amostraFile = salvarDerivado(previewBlob, nomeAmostra, _helpers.getAmostrasFolder());
    thumbnailFile = salvarDerivado(thumbnailBlob, '[THUMB]' + nomeAmostra, _helpers.getThumbnailsFolder());
    var linkAmostra = 'https://drive.google.com/file/d/' + amostraFile.getId() + '/view?usp=sharing';

    // 4. Persist references before removing the source so failures can be retried.
    _helpers.registrarFoto({
      id:           id,
      evento:       evento,
      eventoId:     eventoId || evento, // eventoId estruturado para cross-reference
      originalFileId: originalFileId,
      previewFileId:  amostraFile.getId(),
      thumbnailFileId: thumbnailFile.getId(),
      linkAmostra:  linkAmostra,
      tipoFoto:     capa ? 'capa' : 'foto',
      preco:        PRECO_PADRAO,
    });
    persistido = true;

    // Remove source only after successful persistence in the sheet.
    arquivo.setTrashed(true);

    Logger.log('Foto processada: ' + id);
  } catch (e) {
    if (!persistido) {
      if (thumbnailFile) _helpers.trashFileById(thumbnailFile.getId());
      if (amostraFile) _helpers.trashFileById(amostraFile.getId());
      if (copiaOriginal) _helpers.trashFileById(copiaOriginal.getId());
    }
    notificarErroProcessamento(arquivo, e);
    Logger.log('Erro processarFoto: ' + e.message);
    // Do not remove source. Re-throw so the event is not marked as fully processed.
    throw e;
  }
}

function reprocessarMiniaturasEmLote() {
  var props = PropertiesService.getScriptProperties();
  var limite = parseInt(props.getProperty('THUMBNAIL_BATCH_SIZE'), 10) || 5;
  var fotos = _helpers.listarFotosParaReprocessar(limite);
  var backendUrl = props.getProperty('BACKEND_URL');
  var headers = {
    'Content-Type': 'application/json',
    'x-watermark-secret': props.getProperty('WATERMARK_API_SECRET') || '',
  };
  var eventosAtualizados = {};

  fotos.forEach(function(foto) {
    // The current preview already contains the watermark for sale photos.
    // Resizing it avoids reopening originals or applying a second watermark layer.
    var previewBlob = solicitarDerivado(foto.PreviewFileID, true, 'preview', backendUrl, headers);
    var thumbnailBlob = solicitarDerivado(foto.PreviewFileID, true, 'thumbnail', backendUrl, headers);
    var previewFile = salvarDerivado(previewBlob, '[PREVIEW-OTIMIZADA]' + foto.FotoID + '.jpg', _helpers.getAmostrasFolder());
    var thumbnailFile = salvarDerivado(thumbnailBlob, '[THUMB]' + foto.FotoID + '.jpg', _helpers.getThumbnailsFolder());
    var atualizado = _helpers.atualizarDerivadosFoto(foto.FotoID, previewFile.getId(), thumbnailFile.getId());
    if (!atualizado) {
      _helpers.trashFileById(previewFile.getId());
      _helpers.trashFileById(thumbnailFile.getId());
      throw new Error('Foto nao encontrada ao atualizar derivados: ' + foto.FotoID);
    }
    if (foto.PreviewFileID && foto.PreviewFileID !== previewFile.getId()) {
      _helpers.trashFileById(foto.PreviewFileID);
    }
    eventosAtualizados[foto.EventoID] = true;
  });

  Object.keys(eventosAtualizados).forEach(function(eventoId) {
    _helpers.invalidarCacheSite(eventoId);
  });
  Logger.log(fotos.length + ' foto(s) reprocessada(s) com miniaturas otimizadas.');
}

function organizarMiniaturasEmPasta() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('THUMBNAILS_FOLDER_ID')) {
    throw new Error('Configure THUMBNAILS_FOLDER_ID antes de organizar miniaturas existentes.');
  }
  var limite = parseInt(props.getProperty('THUMBNAIL_ORGANIZE_BATCH_SIZE'), 10) || 100;
  var destino = _helpers.getThumbnailsFolder();
  var fotos = _helpers.listarFotosComMiniatura();
  var movidas = 0;
  for (var i = 0; i < fotos.length && movidas < limite; i++) {
    if (_helpers.moveFileToFolderIfNeeded(fotos[i].ThumbnailFileID, destino)) movidas++;
  }
  Logger.log(movidas + ' miniatura(s) movida(s) para a pasta Miniaturas, sem criar copias.');
}

if (typeof module !== 'undefined') {
  module.exports = {
    gerarIdFoto: gerarIdFoto,
    gerarNomeAmostra: gerarNomeAmostra,
    ehArquivoCapa: ehArquivoCapa,
    notificarErroProcessamento: notificarErroProcessamento,
    processarFoto: processarFoto,
    reprocessarMiniaturasEmLote: reprocessarMiniaturasEmLote,
    organizarMiniaturasEmPasta: organizarMiniaturasEmPasta,
  };
}
