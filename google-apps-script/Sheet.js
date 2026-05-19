// Sheet.js — SpreadsheetApp operations for the "Fotos" sheet.
// Column mapping (1-based for getRange):
// 1=ID, 2=Evento, 3=Link_Original, 4=Link_Amostra, 5=Status,
// 6=WhatsApp, 7=Total_Pago, 8=ID_Mercado_Pago, 9=Data_Processamento,
// 10=Data_Pagamento, 11=Link_Entrega, 12=Tentativas_Entrega, 13=Preco, 14=EventoID

var COL = {
  ID: 1, EVENTO: 2, LINK_ORIGINAL: 3, LINK_AMOSTRA: 4, STATUS: 5,
  WHATSAPP: 6, TOTAL_PAGO: 7, ID_MERCADO_PAGO: 8, DATA_PROCESSAMENTO: 9,
  DATA_PAGAMENTO: 10, LINK_ENTREGA: 11, TENTATIVAS_ENTREGA: 12, PRECO: 13, EVENTO_ID: 14,
};

function getConfig(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getSheet() {
  return SpreadsheetApp.openById(getConfig('SPREADSHEET_ID')).getSheetByName('Fotos');
}

// ---------------------------------------------------------------------------
// Aba "Eventos" — gerenciamento de eventos multi-evento
// ---------------------------------------------------------------------------

function getEventosSheet() {
  var ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
  var sheet = ss.getSheetByName('Eventos');
  if (!sheet) {
    sheet = ss.insertSheet('Eventos');
    sheet.appendRow([
      'EventoID', 'NomePasta', 'FolderID', 'Status',
      'TotalFotos', 'FotosProcessadas', 'FotosEntregues',
      'DataCriacao', 'DataInicio', 'DataConclusao', 'Erros', 'PastaRemovida',
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function registrarEvento(eventData) {
  var sheet = getEventosSheet();
  sheet.appendRow([
    eventData.eventoId,
    eventData.nomePasta,
    eventData.folderId,
    'Pendente',
    eventData.totalFotos,
    0,
    0,
    new Date().toISOString(),
    '',
    '',
    '',
    false,
  ]);
}

function atualizarStatusEvento(eventoId, status, extra) {
  var sheet = getEventosSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === eventoId) {
      sheet.getRange(i + 1, 4).setValue(status);
      if (extra) {
        if (extra.fotosProcessadas !== undefined) sheet.getRange(i + 1, 6).setValue(extra.fotosProcessadas);
        if (extra.fotosEntregues !== undefined)   sheet.getRange(i + 1, 7).setValue(extra.fotosEntregues);
        if (extra.dataInicio)                     sheet.getRange(i + 1, 9).setValue(extra.dataInicio);
        if (extra.dataConclusao)                  sheet.getRange(i + 1, 10).setValue(extra.dataConclusao);
        if (extra.erro)                           sheet.getRange(i + 1, 11).setValue(extra.erro);
        if (extra.pastaRemovida !== undefined)     sheet.getRange(i + 1, 12).setValue(extra.pastaRemovida);
      }
      return true;
    }
  }
  return false;
}

function getStatusEvento(eventoId) {
  var sheet = getEventosSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === eventoId) {
      return {
        eventoId:         data[i][0],
        nomePasta:        data[i][1],
        folderId:         data[i][2],
        status:           data[i][3],
        totalFotos:       data[i][4],
        fotosProcessadas: data[i][5],
        fotosEntregues:   data[i][6],
        dataInicio:       data[i][8],
        pastaRemovida:    data[i][11],
      };
    }
  }
  return null;
}

function getStatusEventoByFolderId(folderId) {
  var sheet = getEventosSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === folderId) {
      return { eventoId: data[i][0], status: data[i][3] };
    }
  }
  return null;
}

/**
 * Dupla verificação: contadores do evento + contagem real na aba Fotos.
 * Só retorna true quando 100% das fotos estão Entregues.
 */
function eventoProntoParaRemover(eventoId) {
  var ev = getStatusEvento(eventoId);
  if (!ev) return false;
  if (ev.pastaRemovida === true) return false;
  if (ev.totalFotos <= 0) return false;
  if (ev.fotosProcessadas < ev.totalFotos) return false;
  if (ev.fotosEntregues < ev.totalFotos) return false;
  // Double-check: conta linhas reais no Sheets
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  var entregues = rows.filter(function(r) {
    return r[COL.EVENTO_ID - 1] === eventoId && r[COL.STATUS - 1] === 'Entregue';
  });
  return entregues.length >= ev.totalFotos;
}

// ---------------------------------------------------------------------------
// Aba "Fotos" — funções existentes
// ---------------------------------------------------------------------------

function registrarFoto(dados) {
  var sheet = getSheet();
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
  sheet.appendRow([
    dados.id, dados.evento, dados.linkOriginal, dados.linkAmostra,
    'Processada', '', dados.preco || 25, '', agora, '', '', 0,
    dados.preco || 25, dados.eventoId || '',
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
  module.exports = {
    getSheet, getEventosSheet,
    registrarFoto, registrarEvento,
    atualizarStatusEvento, getStatusEvento, getStatusEventoByFolderId,
    eventoProntoParaRemover,
    listarPagamentosConfirmados, atualizarCelula, incrementarTentativas,
    COL,
  };
}
