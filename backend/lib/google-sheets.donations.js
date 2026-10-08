const { getDoc } = require('./google-sheets.shared');

const DOACOES_HEADERS = [
  'DoacaoID', 'SessionID', 'PaymentID', 'AssinaturaID', 'ClienteID', 'Status',
  'Destino', 'Frequencia', 'MeioPagamento', 'Valor', 'TaxaCoberta', 'Total',
  'Nome', 'Email', 'DataCriacao', 'DataPagamento', 'EmailStatus',
];

// A planilha em pt-BR devolve valores monetarios com virgula decimal ("5,61").
function moneyValue(value) {
  return Number(String(value || '0').replace(',', '.')) || 0;
}

async function doacoesSheet() {
  const doc = await getDoc();
  return doc.sheetsByTitle.Doacoes || doc.addSheet({ title: 'Doacoes', headerValues: DOACOES_HEADERS });
}

function doacaoFromRow(row) {
  return {
    row,
    id: row.get('DoacaoID'),
    sessionId: row.get('SessionID') || '',
    paymentId: row.get('PaymentID') || '',
    subscriptionId: row.get('AssinaturaID') || '',
    customerId: row.get('ClienteID') || '',
    status: row.get('Status') || '',
    destino: row.get('Destino') || '',
    frequency: row.get('Frequencia') || 'unica',
    method: row.get('MeioPagamento') || '',
    amount: moneyValue(row.get('Valor')),
    fee: moneyValue(row.get('TaxaCoberta')),
    total: moneyValue(row.get('Total')),
    name: row.get('Nome') || '',
    email: row.get('Email') || '',
    createdAt: row.get('DataCriacao') || '',
    paidAt: row.get('DataPagamento') || '',
  };
}

async function registrarDoacao(doacao) {
  const target = await doacoesSheet();
  await target.addRow({
    DoacaoID: doacao.id,
    SessionID: doacao.sessionId || '',
    PaymentID: doacao.paymentId || '',
    AssinaturaID: doacao.subscriptionId || '',
    ClienteID: doacao.customerId || '',
    Status: doacao.status || 'Pendente',
    Destino: doacao.destino,
    Frequencia: doacao.frequency,
    MeioPagamento: doacao.method,
    Valor: doacao.amount,
    TaxaCoberta: doacao.fee || 0,
    Total: doacao.total,
    Nome: doacao.name || '',
    Email: doacao.email || '',
    DataCriacao: new Date().toISOString(),
    DataPagamento: doacao.paidAt || '',
    EmailStatus: doacao.emailStatus || '',
  });
}

async function buscarDoacaoById(doacaoId) {
  const target = await doacoesSheet();
  const match = (await target.getRows()).find((row) => row.get('DoacaoID') === doacaoId);
  return match ? doacaoFromRow(match) : null;
}

async function atualizarDoacao(doacaoId, fields) {
  const doacao = await buscarDoacaoById(doacaoId);
  if (!doacao) throw new Error('Doacao nao encontrada.');
  Object.entries(fields).forEach(([column, value]) => doacao.row.set(column, value));
  await doacao.row.save();
  return doacao;
}

module.exports = { DOACOES_HEADERS, registrarDoacao, buscarDoacaoById, atualizarDoacao };
