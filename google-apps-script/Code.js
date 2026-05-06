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
  ScriptApp.newTrigger('processarFotosNovas').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('entregarFotos').timeBased().everyMinutes(2).create();
  Logger.log('Triggers criados com sucesso.');
}

/**
 * Called every 5 minutes.
 * Detects new images in source folder, copies to two folders, registers in Sheet.
 */
function processarFotosNovas() {
  Logger.log('processarFotosNovas: ' + new Date());
  var arquivos = listNewFiles();
  Logger.log(arquivos.length + ' arquivo(s) novo(s).');
  arquivos.forEach(function(arquivo) { processarFoto(arquivo); });
}

/**
 * Called every 2 minutes.
 * Finds rows with "Pagamento Confirmado" and generates wa.me delivery links.
 */
function entregarFotos() {
  Logger.log('entregarFotos: ' + new Date());
  processarEntregas();
}

if (typeof module !== 'undefined') {
  module.exports = { criarTriggers, processarFotosNovas, entregarFotos };
}
