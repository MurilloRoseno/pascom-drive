// Watermark.js — Photo processing: copy original, apply watermark via backend, register.
// "Watermark" = pixel-level PNG overlay applied by calling POST /api/watermark on the backend.
//
// Architecture note:
//   The backend returns raw JPEG bytes (not a Drive link) to avoid the
//   "Service Accounts do not have storage quota" limitation. Apps Script
//   saves the blob directly to Drive as the authenticated user (who has quota).

/* global copyFileToFolder, getShareableLink, getOriginaisFolder, getAmostrasFolder,
          registrarFoto, UrlFetchApp, PropertiesService, MailApp, Logger */

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
      registrarFoto:     sheet.registrarFoto,
    };
  }
  // In Apps Script context, these are global functions injected by the runtime.
  return {
    copyFileToFolder:  function () { return copyFileToFolder.apply(this, arguments); },
    getShareableLink:  function () { return getShareableLink.apply(this, arguments); },
    getOriginaisFolder: function () { return getOriginaisFolder.apply(this, arguments); },
    getAmostrasFolder:  function () { return getAmostrasFolder.apply(this, arguments); },
    registrarFoto:     function () { return registrarFoto.apply(this, arguments); },
  };
}());

function gerarIdFoto() {
  _idCounter += 1;
  return 'FOTO_' + new Date().getTime() + _idCounter;
}

function gerarNomeAmostra(nome) {
  return '[AMOSTRA]' + nome;
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

function processarFoto(arquivo, eventoId, counter) {
  try {
    var id = gerarIdFoto();
    var nomeOriginal = arquivo.getName();
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
    var copiaOriginal = _helpers.copyFileToFolder(arquivo, _helpers.getOriginaisFolder(), id + '_' + nomeOriginal);
    var originalFileId = copiaOriginal.getId();

    // 1. Pre-process: convert format (HEIC→JPEG, etc.) + compress in-place on Drive
    _preprocessarArquivo(arquivo, backendUrl, headers);

    // 2. Call backend to apply watermark — returns raw JPEG bytes
    var payload = JSON.stringify({
      fileId:        arquivo.getId(),
      watermarkType: 'auto',  // backend auto-detects color vs B&W based on image saturation
    });

    var response = UrlFetchApp.fetch(backendUrl + '/api/watermark', {
      method:             'POST',
      headers:            headers,
      payload:            payload,
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Watermark API falhou (' + response.getResponseCode() + '): ' + response.getContentText());
    }

    // 3. Save the returned JPEG blob to AMOSTRAS folder as the authenticated user
    //    (service account has no Drive quota, but Apps Script runs as the user who does)
    //    Always use .jpg extension — backend always returns JPEG regardless of input format.
    //    Multi-event: se tiver eventoId e counter, usa nomenclatura padronizada.
    var nomeAmostra = (eventoId && counter)
      ? gerarNomeAmostra(eventoId + '_' + String(counter).padStart(4, '0') + '.jpg')
      : gerarNomeAmostra(id + '_' + nomeOriginal.replace(/\.[^.]+$/, '.jpg'));
    var blob = response.getBlob();
    blob.setName(nomeAmostra);
    var amostraFile = _helpers.getAmostrasFolder().createFile(blob);
    var linkAmostra = 'https://drive.google.com/file/d/' + amostraFile.getId() + '/view?usp=sharing';

    // 4. Remove source file from SOURCE folder (avoid reprocessing on next trigger run).
    //    Trash it — original is already safely backed up in ORIGINAIS (step 0).
    arquivo.setTrashed(true);

    // 5. Register in Sheet
    _helpers.registrarFoto({
      id:           id,
      evento:       evento,
      eventoId:     eventoId || evento, // eventoId estruturado para cross-reference
      originalFileId: originalFileId,
      previewFileId:  amostraFile.getId(),
      linkAmostra:  linkAmostra,
      preco:        PRECO_PADRAO,
    });

    Logger.log('Foto processada: ' + id);
  } catch (e) {
    notificarErroProcessamento(arquivo, e);
    Logger.log('Erro processarFoto: ' + e.message);
    // Do not remove source. Re-throw so the event is not marked as fully processed.
    throw e;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { gerarIdFoto, gerarNomeAmostra, notificarErroProcessamento, processarFoto };
}
