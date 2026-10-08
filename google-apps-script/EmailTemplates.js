// EmailTemplates.js — Layout unico dos e-mails enviados a administracao.
// Mesma identidade do e-mail de entrega do backend (tabelas + CSS inline).

var EMAIL_CORES = {
  purple: '#6D2077',
  purpleDark: '#461356',
  yellow: '#F7C848',
  gold: '#8A6D0F',
  paper: '#FAF6EF',
  card: '#FFFDF9',
  ink: '#18150F',
  muted: '#6B6470',
  line: '#E6DDE9',
  alertTint: '#FBEDEA',
  alert: '#9A2D1F'
};

function escaparHtmlEmail(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Monta um aviso administrativo em texto e HTML.
 * @param {{titulo: string, resumo: string, detalhes: Array<{rotulo: string, valor: string}>, proximoPasso: string}} dados
 * @returns {{assunto: string, texto: string, html: string}}
 */
function montarEmailAdmin(dados) {
  var c = EMAIL_CORES;
  var corpo = 'Arial, Helvetica, sans-serif';
  var display = "Georgia, 'Times New Roman', serif";
  var detalhes = dados.detalhes || [];

  var linhas = detalhes.map(function(item, index) {
    var borda = index === 0 ? '' : 'border-top:1px solid ' + c.line + ';';
    return '<tr>' +
      '<td style="padding:10px 12px 10px 0;' + borda + 'color:' + c.muted + ';vertical-align:top;white-space:nowrap;">' + escaparHtmlEmail(item.rotulo) + '</td>' +
      '<td style="padding:10px 0;' + borda + 'color:' + c.ink + ';word-break:break-word;">' + escaparHtmlEmail(item.valor) + '</td>' +
      '</tr>';
  }).join('');

  var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:' + c.paper + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + c.paper + ';"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">' +
    '<tr><td style="background:' + c.purpleDark + ';border-radius:12px 12px 0 0;padding:22px 28px;">' +
    '<div style="font-family:' + display + ';font-size:20px;line-height:24px;font-weight:bold;color:' + c.card + ';">Paróquia São Rafael</div>' +
    '<div style="font-family:' + corpo + ';font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:' + c.yellow + ';">Pascom · Aviso do sistema</div>' +
    '</td></tr>' +
    '<tr><td style="background:' + c.card + ';padding:32px 28px 28px;border:1px solid ' + c.line + ';border-top:0;border-radius:0 0 12px 12px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr><td style="background:' + c.alertTint + ';border-radius:999px;padding:6px 14px;font-family:' + corpo + ';font-size:13px;line-height:18px;font-weight:bold;color:' + c.alert + ';">Requer atenção</td></tr></table>' +
    '<h1 style="margin:0 0 14px;font-family:' + display + ';font-size:24px;line-height:30px;font-weight:bold;color:' + c.purple + ';">' + escaparHtmlEmail(dados.titulo) + '</h1>' +
    '<p style="margin:0 0 20px;font-family:' + corpo + ';font-size:16px;line-height:24px;color:' + c.ink + ';">' + escaparHtmlEmail(dados.resumo) + '</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ' + c.line + ';border-bottom:1px solid ' + c.line + ';font-family:' + corpo + ';font-size:14px;line-height:20px;">' + linhas + '</table>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;"><tr><td style="background:' + c.paper + ';border-radius:8px;padding:16px 18px;font-family:' + corpo + ';font-size:14px;line-height:22px;color:' + c.ink + ';">' +
    '<div style="font-family:' + display + ';font-size:16px;line-height:22px;font-weight:bold;color:' + c.purple + ';margin-bottom:6px;">O que fazer</div>' +
    escaparHtmlEmail(dados.proximoPasso) +
    '</td></tr></table>' +
    '<p style="margin:20px 0 0;font-family:' + corpo + ';font-size:12px;line-height:18px;color:' + c.muted + ';">Mensagem automática do sistema de fotos. Não é necessário responder.</p>' +
    '</td></tr></table></td></tr></table></body></html>';

  var texto = [dados.titulo, '', dados.resumo, '']
    .concat(detalhes.map(function(item) { return item.rotulo + ': ' + item.valor; }))
    .concat(['', 'O que fazer: ' + dados.proximoPasso])
    .join('\n');

  return { assunto: '[Pascom] ' + dados.titulo, texto: texto, html: html };
}

if (typeof module !== 'undefined') {
  module.exports = { montarEmailAdmin: montarEmailAdmin, escaparHtmlEmail: escaparHtmlEmail };
}
