// Drive.js — DriveApp folder/file operations.

function getSourceFolder() {
  return DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('SOURCE_FOLDER_ID')
  );
}

function getOriginaisFolder() {
  return DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('ORIGINAIS_FOLDER_ID')
  );
}

function getAmostrasFolder() {
  return DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('AMOSTRAS_FOLDER_ID')
  );
}

function getThumbnailsFolder() {
  var folderId = PropertiesService.getScriptProperties().getProperty('THUMBNAILS_FOLDER_ID');
  // Compatibility fallback: new deployments should configure a separate folder.
  return folderId ? DriveApp.getFolderById(folderId) : getAmostrasFolder();
}

function listNewFiles() {
  var folder = getSourceFolder();
  var iterator = folder.getFiles();
  var result = [];
  while (iterator.hasNext()) {
    var file = iterator.next();
    if (file.getMimeType().indexOf('image/') === 0) {
      result.push(file);
    }
  }
  return result;
}

/**
 * Lista todos os arquivos de imagem dentro de uma subpasta de evento.
 */
function listarArquivosDoEvento(folderId) {
  var pasta    = DriveApp.getFolderById(folderId);
  var arquivos = [];
  var iter     = pasta.getFiles();
  while (iter.hasNext()) {
    var f = iter.next();
    if (f.getMimeType().indexOf('image/') === 0) {
      arquivos.push(f);
    }
  }
  return arquivos;
}

/**
 * Renomeia pasta de evento para _ERRO_* (quarentena) em vez de deletar.
 * Usado quando há erros durante processamento.
 */
function moverParaQuarentena(folderId, motivo) {
  var pasta    = DriveApp.getFolderById(folderId);
  var novoNome = '_ERRO_' + pasta.getName() + '_' +
    Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMddHHmm');
  pasta.setName(novoNome);
  Logger.log('Evento em quarentena: ' + novoNome + ' | Motivo: ' + motivo);
}

/**
 * Remove pasta de evento do SOURCE após verificação dupla.
 * SÓ executa se eventoProntoParaRemover() retornar true.
 */
function removerPastaEvento(eventoId, folderId) {
  if (!eventoProntoParaRemover(eventoId)) {
    Logger.log('BLOQUEADO: tentativa de remover ' + eventoId + ' mas não está pronto');
    return false;
  }
  var pasta = DriveApp.getFolderById(folderId);
  pasta.setTrashed(true);
  atualizarStatusEvento(eventoId, 'Concluido', { pastaRemovida: true });
  Logger.log('Pasta removida com segurança: ' + eventoId);
  return true;
}

function copyFileToFolder(file, destinationFolder, newName) {
  return file.makeCopy(newName, destinationFolder);
}

function trashFileById(fileId) {
  if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
}

function moveFileToFolderIfNeeded(fileId, destinationFolder) {
  if (!fileId) return false;
  var file = DriveApp.getFileById(fileId);
  var parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === destinationFolder.getId()) return false;
  }
  file.moveTo(destinationFolder);
  return true;
}

function getShareableLink(file) {
  return 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing';
}

if (typeof module !== 'undefined') {
  module.exports = {
    getSourceFolder, getOriginaisFolder, getAmostrasFolder, getThumbnailsFolder,
    listNewFiles, listarArquivosDoEvento,
    moverParaQuarentena, removerPastaEvento,
    copyFileToFolder, trashFileById, moveFileToFolderIfNeeded, getShareableLink,
  };
}
