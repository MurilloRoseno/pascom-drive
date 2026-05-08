const { GoogleSpreadsheet } = require('google-spreadsheet');

function driveUrlToThumbnail(sharingUrl) {
  const match = sharingUrl && sharingUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return sharingUrl;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
}

let _sheet = null;

async function getSheet() {
  if (_sheet) return _sheet;
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  });
  await doc.loadInfo();
  _sheet = doc.sheetsByTitle['Fotos'];
  return _sheet;
}

async function listarFotos() {
  const sheet = await getSheet();
  const rows = await sheet.getRows();
  return rows
    .filter(r => r.Status === 'Processada')
    .map(r => ({
      id: r.ID,
      event: r.Evento,
      url: driveUrlToThumbnail(r.Link_Amostra),
      price: parseFloat(r.Preco) || 25.00,
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
  const row = rows.find(r => r.ID === fotoId || r.ID_Mercado_Pago === fotoId);
  if (!row) throw new Error(`ID não encontrado: ${fotoId}`);
  row.Status = novoStatus;
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  if (novoStatus === 'Pagamento Confirmado') row.Data_Pagamento = now;
  if (novoStatus === 'Entregue') row.Data_Entrega = now;
  await row.save();
}

module.exports = { listarFotos, registrarPedido, atualizarStatus, driveUrlToThumbnail };
