const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

function driveUrlToThumbnail(sharingUrl) {
  const match = sharingUrl && sharingUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return sharingUrl;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
}

let _sheet = null;

async function getSheet() {
  if (_sheet) return _sheet;
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: Buffer.from(process.env.GOOGLE_PRIVATE_KEY_B64 || '', 'base64').toString('utf8'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
  await doc.loadInfo();
  _sheet = doc.sheetsByTitle['Fotos'];
  return _sheet;
}

async function listarFotos() {
  const sheet = await getSheet();
  const rows = await sheet.getRows();
  return rows
    .filter(r => r.get('Status') === 'Processada')
    .map(r => ({
      id:    r.get('ID'),
      event: r.get('Evento'),
      url:   driveUrlToThumbnail(r.get('Link_Amostra')),
      price: parseFloat(r.get('Preco')) || 25.00,
    }));
}

async function registrarPedido({ fotoIds, whatsapp, totalPago, idMercadoPago }) {
  const sheet = await getSheet();
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  await sheet.addRow({
    ID: `PEDIDO_${Date.now()}`,
    WhatsApp: whatsapp,
    Total_Pago: totalPago,
    ID_Mercado_Pago: idMercadoPago,
    Status: 'Pagamento Pendente',
    Foto_IDs: fotoIds.join(','),
    Data_Processamento: now,
  });
}

async function atualizarStatus(fotoId, novoStatus) {
  const sheet = await getSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get('ID') === fotoId || r.get('ID_Mercado_Pago') === fotoId);
  if (!row) throw new Error(`ID não encontrado: ${fotoId}`);
  row.set('Status', novoStatus);
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  if (novoStatus === 'Pagamento Confirmado') row.set('Data_Pagamento', now);
  if (novoStatus === 'Entregue') row.set('Data_Entrega', now);
  await row.save();
}

module.exports = { listarFotos, registrarPedido, atualizarStatus, driveUrlToThumbnail };
