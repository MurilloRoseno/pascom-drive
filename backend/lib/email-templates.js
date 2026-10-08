// email-templates.js — HTML de e-mail compativel com Gmail/Outlook:
// tabelas, CSS inline, 600px, fontes do sistema. Cores da marca da paroquia.

const COLORS = {
  purple: '#6D2077',
  purpleDark: '#461356',
  yellow: '#F7C848',
  gold: '#8A6D0F',
  green: '#2F6B4C',
  greenTint: '#E7F1EB',
  paper: '#FAF6EF',
  card: '#FFFDF9',
  ink: '#18150F',
  muted: '#6B6470',
  line: '#E6DDE9',
};
const FONT_DISPLAY = "Georgia, 'Times New Roman', serif";
const FONT_BODY = 'Arial, Helvetica, sans-serif';
const SECRETARIA = {
  whatsappUrl: 'https://wa.me/5599991646063',
  whatsappLabel: '(99) 99164-6063',
  email: 'paroquiasaorafael@hotmail.com',
  hours: 'Terça a sexta, das 8h30 às 11h',
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function appUrl() {
  return String(process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app').replace(/\/$/, '');
}

function layout({ preheader, eyebrow, title, bodyHtml }) {
  const base = appUrl();
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.paper};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.paper};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="background:${COLORS.purpleDark};border-radius:12px 12px 0 0;padding:22px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:14px;vertical-align:middle;"><img src="${base}/assets/logo-white.png" alt="" height="44" style="display:block;height:44px;width:auto;border:0;"></td>
<td style="vertical-align:middle;">
<div style="font-family:${FONT_DISPLAY};font-size:20px;line-height:24px;font-weight:bold;color:${COLORS.card};">Paróquia São Rafael</div>
<div style="font-family:${FONT_BODY};font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.yellow};">Açailândia · Fotos</div>
</td>
</tr></table>
</td></tr>
<tr><td style="background:${COLORS.card};padding:32px 28px 28px;border-left:1px solid ${COLORS.line};border-right:1px solid ${COLORS.line};">
<div style="font-family:${FONT_BODY};font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;color:${COLORS.gold};">${escapeHtml(eyebrow)}</div>
<h1 style="margin:6px 0 18px;font-family:${FONT_DISPLAY};font-size:26px;line-height:32px;font-weight:bold;color:${COLORS.purple};">${escapeHtml(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="background:${COLORS.paper};border:1px solid ${COLORS.line};border-radius:0 0 12px 12px;padding:20px 28px;font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${COLORS.muted};">
<strong style="color:${COLORS.ink};">Precisa de ajuda?</strong> Fale com a secretaria paroquial:<br>
WhatsApp <a href="${SECRETARIA.whatsappUrl}" style="color:${COLORS.purple};">${SECRETARIA.whatsappLabel}</a> ·
<a href="mailto:${SECRETARIA.email}" style="color:${COLORS.purple};">${SECRETARIA.email}</a><br>
${SECRETARIA.hours}
<div style="margin-top:12px;font-size:12px;line-height:18px;">Você recebeu este e-mail porque informou este endereço em uma compra de fotos. <a href="${base}/privacidade" style="color:${COLORS.muted};">Política de privacidade</a></div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function paragraph(html) {
  return `<p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:16px;line-height:24px;color:${COLORS.ink};">${html}</p>`;
}

function button(url, label) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;"><tr>
<td align="center" bgcolor="${COLORS.yellow}" style="background:${COLORS.yellow};border-radius:8px;">
<a href="${escapeHtml(url)}" style="display:block;padding:14px 18px;font-family:${FONT_BODY};font-size:16px;line-height:20px;font-weight:bold;color:${COLORS.ink};text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function infoBlock(title, html) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;"><tr>
<td style="background:${COLORS.paper};border-radius:8px;padding:16px 18px;font-family:${FONT_BODY};font-size:14px;line-height:22px;color:${COLORS.ink};">
<div style="font-family:${FONT_DISPLAY};font-size:16px;line-height:22px;font-weight:bold;color:${COLORS.purple};margin-bottom:6px;">${escapeHtml(title)}</div>
${html}
</td></tr></table>`;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function entregaFotosEmail({ pedido, downloads }) {
  const base = appUrl();
  const total = downloads.length;
  const fotos = `${total} foto${total === 1 ? '' : 's'}`;
  const nome = firstName(pedido.name);
  const saudacao = nome ? `Olá, ${nome}!` : 'Olá!';
  const pedidoId = String(pedido.id || '');
  const recuperarUrl = `${base}/recuperar-pedido`;

  const bodyHtml = [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td style="background:${COLORS.greenTint};border-radius:999px;padding:6px 14px;font-family:${FONT_BODY};font-size:13px;line-height:18px;font-weight:bold;color:${COLORS.green};">&#10003; Pagamento confirmado</td></tr></table>`,
    paragraph(`${escapeHtml(saudacao)} Recebemos seu pagamento e ${total === 1 ? 'sua foto está pronta' : 'suas fotos estão prontas'} para baixar em alta resolução, sem marca d'água.`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;border-top:1px solid ${COLORS.line};border-bottom:1px solid ${COLORS.line};font-family:${FONT_BODY};font-size:14px;line-height:20px;">
<tr><td style="padding:10px 0;color:${COLORS.muted};">Pedido</td><td align="right" style="padding:10px 0;font-family:'Courier New',monospace;color:${COLORS.ink};">${escapeHtml(pedidoId)}</td></tr>
<tr><td style="padding:10px 0;border-top:1px solid ${COLORS.line};color:${COLORS.muted};">Itens</td><td align="right" style="padding:10px 0;border-top:1px solid ${COLORS.line};color:${COLORS.ink};">${fotos}</td></tr>
</table>`,
    downloads.map((item, index) => button(item.url, `Baixar foto ${index + 1}`)).join('\n'),
    infoBlock('Antes de baixar', `Os links valem por <strong>24 horas</strong> e cada um pode ser usado até <strong>2 vezes</strong>. Salve ${total === 1 ? 'a foto' : 'as fotos'} no seu aparelho assim que baixar.`),
    infoBlock('O link expirou?', `Acesse <a href="${recuperarUrl}" style="color:${COLORS.purple};">Recuperar pedido</a> e informe este e-mail e o código do pedido acima para gerar novos links.`),
  ].join('\n');

  const text = [
    `${saudacao} Recebemos seu pagamento e ${total === 1 ? 'sua foto está pronta' : 'suas fotos estão prontas'} para baixar em alta resolução, sem marca d'água.`,
    '',
    `Pedido: ${pedidoId}`,
    `Itens: ${fotos}`,
    '',
    ...downloads.map((item, index) => `Baixar foto ${index + 1}: ${item.url}`),
    '',
    'Os links valem por 24 horas e cada um pode ser usado até 2 vezes.',
    `Link expirou? Acesse ${recuperarUrl} e informe este e-mail e o código do pedido.`,
    '',
    `Secretaria paroquial: WhatsApp ${SECRETARIA.whatsappLabel} · ${SECRETARIA.email} · ${SECRETARIA.hours}`,
  ].join('\n');

  return {
    subject: 'Suas fotos estão prontas — Paróquia São Rafael',
    html: layout({
      preheader: `Pagamento confirmado. ${fotos} para baixar em até 24 horas.`,
      eyebrow: 'Entrega do pedido',
      title: total === 1 ? 'Sua foto está pronta' : 'Suas fotos estão prontas',
      bodyHtml,
    }),
    text,
  };
}

module.exports = { entregaFotosEmail, escapeHtml, layout };
