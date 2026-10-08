// WhatsApp.js — Generate wa.me delivery links and save to Sheet.
// "Delivery" = Link_Entrega col saved in Sheet for admin to click.
// Retry logic: Tentativas_Entrega col, max 3, email admin on final failure.

var MAX_TENTATIVAS = 3;
var MENSAGEM_TEMPLATE = 'Olá! Aqui estão suas fotos da Paróquia São Rafael:\n\n{LINK}\n\nObrigado pela participação! 📸';

function notificarFalhaEntrega(row, erro) {
  var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!adminEmail) return;
  try {
    var email = montarEmailAdmin({
      titulo: 'Falha definitiva de entrega: ' + row.id,
      resumo: 'O sistema não conseguiu preparar a entrega deste registro depois de todas as tentativas.',
      detalhes: [
        { rotulo: 'Registro', valor: row.id },
        { rotulo: 'Tentativas', valor: String(MAX_TENTATIVAS) },
        { rotulo: 'Erro', valor: erro.message }
      ],
      proximoPasso: 'Faça a entrega manualmente pela secretaria e confira os dados do comprador na planilha.'
    });
    MailApp.sendEmail(adminEmail, email.assunto, email.texto, { htmlBody: email.html });
  } catch (mailError) {
    Logger.log('Aviso por e-mail nao enviado: ' + mailError.message);
  }
}

function gerarLinkWaMe(numero, linkFoto) {
  var digits = numero.replace(/\D/g, '');
  if (digits.indexOf('55') !== 0) digits = '55' + digits;
  var msg = MENSAGEM_TEMPLATE.replace('{LINK}', linkFoto);
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg);
}

function tentarEntrega(row) {
  if (row.tentativas >= MAX_TENTATIVAS) {
    Logger.log('Skipping ' + row.id + ' — max tentativas atingido.');
    return;
  }
  try {
    var waLink = gerarLinkWaMe(row.whatsapp, row.linkOriginal);
    atualizarCelula(row.rowIndex, COL.LINK_ENTREGA, waLink);
    atualizarCelula(row.rowIndex, COL.STATUS, 'Entregue');
    Logger.log('Entregue: ' + row.id);
  } catch (e) {
    incrementarTentativas(row.rowIndex);
    Logger.log('Falha entrega ' + row.id + ' (tentativa ' + (row.tentativas + 1) + '): ' + e.message);
    if (row.tentativas + 1 >= MAX_TENTATIVAS) {
      notificarFalhaEntrega(row, e);
    }
  }
}

function processarEntregas() {
  var rows = listarPagamentosConfirmados();
  Logger.log('processarEntregas: ' + rows.length + ' linha(s).');
  rows.forEach(function(row) { tentarEntrega(row); });
}

if (typeof module !== 'undefined') {
  module.exports = { gerarLinkWaMe, notificarFalhaEntrega, tentarEntrega, processarEntregas };
}
