// Watermark.js — Photo processing: copy original, apply watermark via backend, register.
// "Watermark" = pixel-level PNG overlay applied by calling POST /api/watermark on the backend.
//
// Architecture note:
//   The backend returns raw JPEG bytes (not a Drive link) to avoid the
//   "Service Accounts do not have storage quota" limitation. Apps Script
//   saves the blob directly to Drive as the authenticated user (who has quota).

/* global copyFileToFolder, getShareableLink, getOriginaisFolder, getAmostrasFolder,
          registrarFoto, UrlFetchApp, PropertiesService, MailApp, Logger */

var PRECO_PADRAO = 25;
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
 * Process a photo: copy original → ORIGINAIS, apply watermark via backend,
 * save returned JPEG blob → AMOSTRAS (as the authenticated user, who has Drive quota),
 * move source file out of SOURCE folder, register in Sheet.
 * On any failure: sends admin email, leaves source file untouched for retry.
 * @param {GoogleAppsScript.Drive.File} arquivo
 */
function processarFoto(arquivo) {
  try {
    var id = gerarIdFoto();
    var nomeOriginal = arquivo.getName();
    var evento = arquivo.getParents().hasNext()
      ? arquivo.getParents().next().getName()
      : 'Sem_Evento';

    // 1. Copy original to ORIGINAIS folder (unchanged, high quality backup)
    var copiaOriginal = _helpers.copyFileToFolder(arquivo, _helpers.getOriginaisFolder(), id + '_' + nomeOriginal);
    var linkOriginal  = _helpers.getShareableLink(copiaOriginal);

    // 2. Call backend to apply watermark — returns raw JPEG bytes
    var props      = PropertiesService.getScriptProperties();
    var backendUrl = props.getProperty('BACKEND_URL');

    var payload = JSON.stringify({
      fileId:        arquivo.getId(),
      watermarkType: 'color',
    });

    var response = UrlFetchApp.fetch(backendUrl + '/api/watermark', {
      method:             'POST',
      headers:            { 'Content-Type': 'application/json' },
      payload:            payload,
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Watermark API falhou (' + response.getResponseCode() + '): ' + response.getContentText());
    }

    // 3. Save the returned JPEG blob to AMOSTRAS folder as the authenticated user
    //    (service account has no Drive quota, but Apps Script runs as the user who does)
    var blob = response.getBlob();
    blob.setName(gerarNomeAmostra(id + '_' + nomeOriginal));
    var amostraFile = _helpers.getAmostrasFolder().createFile(blob);
    var linkAmostra = 'https://drive.google.com/file/d/' + amostraFile.getId() + '/view?usp=sharing';

    // 4. Move source file out of SOURCE folder — prevents reprocessing on next trigger run
    arquivo.moveTo(_helpers.getOriginaisFolder());

    // 5. Register in Sheet
    _helpers.registrarFoto({
      id:           id,
      evento:       evento,
      linkOriginal: linkOriginal,
      linkAmostra:  linkAmostra,
      preco:        PRECO_PADRAO,
    });

    Logger.log('Foto processada: ' + id);
  } catch (e) {
    var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    MailApp.sendEmail(
      adminEmail,
      '[Pascom] Erro ao processar foto: ' + arquivo.getName(),
      'Erro: ' + e.message
    );
    Logger.log('Erro processarFoto: ' + e.message);
    // Do NOT move arquivo — leave in SOURCE folder so the next trigger run retries
  }
}

if (typeof module !== 'undefined') {
  module.exports = { gerarIdFoto, gerarNomeAmostra, processarFoto };
}
