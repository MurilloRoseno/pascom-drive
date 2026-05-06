// Sheet.js — SpreadsheetApp operations for the "Fotos" sheet.
// Column mapping (1-based for getRange):
// 1=ID, 2=Evento, 3=Link_Original, 4=Link_Amostra, 5=Status,
// 6=WhatsApp, 7=Total_Pago, 8=ID_Mercado_Pago, 9=Data_Processamento,
// 10=Data_Pagamento, 11=Link_Entrega, 12=Tentativas_Entrega

var COL = {
  ID: 1, EVENTO: 2, LINK_ORIGINAL: 3, LINK_AMOSTRA: 4, STATUS: 5,
  WHATSAPP: 6, TOTAL_PAGO: 7, ID_MERCADO_PAGO: 8, DATA_PROCESSAMENTO: 9,
  DATA_PAGAMENTO: 10, LINK_ENTREGA: 11, TENTATIVAS_ENTREGA: 12,
};

function getSheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(id).getSheetByName('Fotos');
}

function registrarFoto(dados) {
  var sheet = getSheet();
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
  sheet.appendRow([
    dados.id, dados.evento, dados.linkOriginal, dados.linkAmostra,
    'Processada', '', dados.preco || 25, '', agora, '', '', 0,
  ]);
}

function listarPagamentosConfirmados() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[COL.STATUS - 1] === 'Pagamento Confirmado') {
      result.push({
        id: row[COL.ID - 1],
        evento: row[COL.EVENTO - 1],
        linkOriginal: row[COL.LINK_ORIGINAL - 1],
        whatsapp: row[COL.WHATSAPP - 1],
        tentativas: parseInt(row[COL.TENTATIVAS_ENTREGA - 1]) || 0,
        rowIndex: i + 1,
      });
    }
  }
  return result;
}

function atualizarCelula(rowIndex, colIndex, value) {
  getSheet().getRange(rowIndex, colIndex).setValue(value);
}

function incrementarTentativas(rowIndex) {
  var sheet = getSheet();
  var cell = sheet.getRange(rowIndex, COL.TENTATIVAS_ENTREGA);
  cell.setValue((parseInt(cell.getValue()) || 0) + 1);
}

if (typeof module !== 'undefined') {
  module.exports = { getSheet, registrarFoto, listarPagamentosConfirmados, atualizarCelula, incrementarTentativas, COL };
}
