const crypto = require('crypto');
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

async function enviarEmailEntrega(pedido, downloads) {
  if (!process.env.RESEND_API_KEY || !process.env.DELIVERY_FROM_EMAIL) return false;
  const links = downloads.map((item, index) => `<li><a href="${item.url}">Baixar foto ${index + 1}</a></li>`).join('');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.DELIVERY_FROM_EMAIL,
      to: [pedido.email],
      subject: 'Suas fotos - Paroquia Sao Rafael',
      html: `<p>Pagamento confirmado. Seus links seguros expiram em 24 horas.</p><ul>${links}</ul>`,
    }),
  });
  if (!response.ok) throw new Error('Falha ao enviar e-mail de entrega.');
  return true;
}

function criarMensagemWhatsApp(downloads) {
  const links = downloads.map((item) => item.url).join('\n');
  return `Ola! Seu pagamento foi confirmado. Seus links seguros de fotos (validos por 24 horas):\n${links}`;
}

module.exports = { criarDownloadsDoPedido, enviarEmailEntrega, criarMensagemWhatsApp };
