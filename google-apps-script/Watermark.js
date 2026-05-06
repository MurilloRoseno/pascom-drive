// Watermark.js — Photo processing: copy to two folders, register in Sheet.
// "Watermark" = [AMOSTRA] prefix on sample copies; no binary image manipulation.

var PRECO_PADRAO = 25;
var _idCounter = 0;

function gerarIdFoto() {
  _idCounter += 1;
  return 'FOTO_' + new Date().getTime() + _idCounter;
}

function gerarNomeAmostra(nome) {
  return '[AMOSTRA]' + nome;
}

function processarFoto(arquivo) {
  try {
    var id = gerarIdFoto();
    var nomeOriginal = arquivo.getName();
    var evento = arquivo.getParents().hasNext()
      ? arquivo.getParents().next().getName()
      : 'Sem_Evento';

    var copiaOriginal = copyFileToFolder(arquivo, getOriginaisFolder(), id + '_' + nomeOriginal);
    var linkOriginal = getShareableLink(copiaOriginal);

    var copiaAmostra = copyFileToFolder(arquivo, getAmostrasFolder(), gerarNomeAmostra(id + '_' + nomeOriginal));
    var linkAmostra = getShareableLink(copiaAmostra);

    registrarFoto({ id: id, evento: evento, linkOriginal: linkOriginal, linkAmostra: linkAmostra, preco: PRECO_PADRAO });
    Logger.log('Foto processada: ' + id);
  } catch (e) {
    var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    MailApp.sendEmail(adminEmail, '[Pascom] Erro ao processar foto: ' + arquivo.getName(), 'Erro: ' + e.message);
    Logger.log('Erro processarFoto: ' + e.message);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { gerarIdFoto, gerarNomeAmostra, processarFoto };
}
