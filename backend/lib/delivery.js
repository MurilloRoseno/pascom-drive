const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { signToken } = require('./jwt-utils');
const { buscarOriginaisPedido, listarDownloadsPedido, gravarAutorizacoesDownload } = require('./google-sheets');
const { createFingerprintId, hashFingerprint, FINGERPRINT_VERSION } = require('./forensic-watermark');

// Link pessoal, com marca invisivel que identifica o pedido: 7 dias e 5 usos.
// Com 24 h o comprador que abria o e-mail no dia seguinte perdia o acesso, e o uso e
// contado quando o download comeca (api/download.js), entao uma queda de conexao gastava
// metade do direito.
const DOWNLOAD_VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const DOWNLOAD_USOS_MAXIMOS = 5;
const VALIDADE_TEXTO = '7 dias';

/**
 * Emite os links do pedido. Reemitir mantem uma linha por foto em Downloads e substitui o
 * hash anterior, ou seja, revoga o link antigo. Chamar duas vezes nao duplica nada.
 */
async function criarDownloadsDoPedido(pedido) {
  const secret = process.env.DOWNLOAD_JWT_SECRET;
  if (!secret) throw new Error('Segredo de download nao configurado.');
  const forensicSecret = process.env.FORENSIC_WATERMARK_SECRET;
  if (!forensicSecret) throw new Error('Segredo forense nao configurado.');
  const [photos, existentes] = await Promise.all([
    buscarOriginaisPedido(pedido.id),
    listarDownloadsPedido(pedido.id),
  ]);
  const porFoto = new Map(existentes.map((item) => [item.fotoId, item.downloadId]));
  const appUrl = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
  const exp = Date.now() + DOWNLOAD_VALIDADE_MS;
  const records = photos.map((photo) => {
    const id = porFoto.get(photo.fotoId) || `DL_${crypto.randomBytes(12).toString('hex')}`;
    const token = signToken({ downloadId: id, exp }, secret);
    const fingerprintId = createFingerprintId(forensicSecret, { pedidoId: pedido.id, fotoId: photo.fotoId, downloadId: id });
    return {
      id,
      fotoId: photo.fotoId,
      originalFileId: photo.originalFileId,
      fingerprintId,
      fingerprintHash: hashFingerprint(fingerprintId),
      fingerprintVersion: FINGERPRINT_VERSION,
      exp,
      expiresAt: new Date(exp).toISOString(),
      maxUses: DOWNLOAD_USOS_MAXIMOS,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      url: `${appUrl}/api/download?token=${encodeURIComponent(token)}`,
    };
  });
  await gravarAutorizacoesDownload(pedido.id, records);
  return records;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: String(process.env.SMTP_APP_PASSWORD || '').replace(/\s/g, ''),
    },
  });
}

function corpoEmail(pedido, downloads) {
  const links = downloads
    .map((item, index) => `<li><a href="${item.url}">Baixar foto ${index + 1}</a></li>`)
    .join('');
  const appUrl = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
  return [
    '<p>Pagamento confirmado. Obrigado!</p>',
    `<p>Seus links pessoais valem <strong>${VALIDADE_TEXTO}</strong> e permitem ate ${DOWNLOAD_USOS_MAXIMOS} downloads cada.</p>`,
    `<ul>${links}</ul>`,
    `<p>Se os links expirarem, recupere-os em <a href="${appUrl}/pedidos/recuperar">${appUrl}/pedidos/recuperar</a>`,
    ` com o numero do pedido <strong>${pedido.id || ''}</strong> e este mesmo e-mail.</p>`,
  ].join('');
}

async function enviarEmailEntrega(pedido, downloads) {
  const attemptedAt = new Date().toISOString();
  if (!smtpConfigured()) {
    return { status: 'nao_configurado', error: 'SMTP nao configurado.', attemptedAt };
  }
  const fromName = process.env.SMTP_FROM_NAME || 'Paroquia Sao Rafael - Fotos';
  try {
    await createTransporter().sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
      to: pedido.email,
      subject: 'Suas fotos - Paroquia Sao Rafael',
      html: corpoEmail(pedido, downloads),
    });
    return { status: 'enviado', error: '', attemptedAt };
  } catch (error) {
    return {
      status: 'falhou',
      error: String(error.message || 'Falha ao enviar e-mail de entrega.').slice(0, 500),
      attemptedAt,
    };
  }
}

function criarMensagemWhatsApp(downloads) {
  const links = downloads.map((item) => item.url).join('\n');
  return `Ola! Seu pagamento foi confirmado. Seus links seguros de fotos (validos por ${VALIDADE_TEXTO}):\n${links}`;
}

/** Link assistido: a secretaria abre e envia a mensagem pelo WhatsApp do comprador. */
function criarLinkWhatsApp(pedido, downloads) {
  const digits = String(pedido.whatsapp || '').replace(/\D/g, '');
  if (!digits) return '';
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(criarMensagemWhatsApp(downloads))}`;
}

module.exports = {
  DOWNLOAD_VALIDADE_MS,
  DOWNLOAD_USOS_MAXIMOS,
  VALIDADE_TEXTO,
  criarDownloadsDoPedido,
  enviarEmailEntrega,
  criarMensagemWhatsApp,
  criarLinkWhatsApp,
};
