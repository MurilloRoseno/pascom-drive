const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { signToken } = require('./jwt-utils');
const { buscarOriginaisPedido, criarAutorizacoesDownload } = require('./google-sheets');

async function criarDownloadsDoPedido(pedido) {
  const secret = process.env.DOWNLOAD_JWT_SECRET;
  if (!secret) throw new Error('Segredo de download nao configurado.');
  const photos = await buscarOriginaisPedido(pedido.id);
  const appUrl = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const records = photos.map((photo) => {
    const id = `DL_${crypto.randomBytes(12).toString('hex')}`;
    const token = signToken({ downloadId: id, exp }, secret);
    return {
      id,
      fotoId: photo.fotoId,
      originalFileId: photo.originalFileId,
      exp,
      maxUses: 2,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      url: `${appUrl}/api/download?token=${encodeURIComponent(token)}`,
    };
  });
  await criarAutorizacoesDownload(pedido.id, records);
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

async function enviarEmailEntrega(pedido, downloads) {
  const attemptedAt = new Date().toISOString();
  if (!smtpConfigured()) {
    return { status: 'nao_configurado', error: 'SMTP nao configurado.', attemptedAt };
  }
  const links = downloads.map((item, index) => `<li><a href="${item.url}">Baixar foto ${index + 1}</a></li>`).join('');
  const fromName = process.env.SMTP_FROM_NAME || 'Paroquia Sao Rafael - Fotos';
  try {
    await createTransporter().sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
      to: pedido.email,
      subject: 'Suas fotos - Paroquia Sao Rafael',
      html: `<p>Pagamento confirmado. Seus links seguros expiram em 24 horas.</p><ul>${links}</ul>`,
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
  return `Ola! Seu pagamento foi confirmado. Seus links seguros de fotos (validos por 24 horas):\n${links}`;
}

module.exports = { criarDownloadsDoPedido, enviarEmailEntrega, criarMensagemWhatsApp };
