const { getDoc } = require('./google-sheets.shared');

const abasConferidas = new Set();

/**
 * Devolve a aba pelo título. Cria com os cabeçalhos quando não existe e, se já
 * existe, acrescenta ao final os cabeçalhos que faltam (nunca mexe nos antigos e
 * aumenta a grade quando as colunas novas não cabem nela).
 * A conferência roda uma vez por título em cada instância.
 * @param {string} titulo
 * @param {string[]} cabecalhos
 */
async function obterAba(titulo, cabecalhos) {
  const doc = await getDoc();
  const existente = doc.sheetsByTitle[titulo];
  if (!existente) return doc.addSheet({ title: titulo, headerValues: cabecalhos });
  if (cabecalhos.length && !abasConferidas.has(titulo)) {
    await existente.loadHeaderRow();
    const faltam = cabecalhos.filter((h) => !existente.headerValues.includes(h));
    if (faltam.length) {
      const novos = [...existente.headerValues, ...faltam];
      if (existente.columnCount < novos.length) {
        await existente.resize({ rowCount: existente.rowCount, columnCount: novos.length });
      }
      await existente.setHeaderRow(novos);
    }
    abasConferidas.add(titulo);
  }
  return existente;
}

module.exports = { obterAba };
