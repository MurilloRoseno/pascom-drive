/**
 * Lê um número que veio de uma célula da planilha. A planilha da paróquia está em português
 * do Brasil: a API devolve "13,95" (e "1.234,56" com milhar), que `Number()` não entende (NaN).
 * Aceita também o formato "13.95", número de verdade e "R$ 13,95". Vazio ou ilegível vira 0,
 * nunca NaN: um valor que não se entende não pode virar "total NaN" que passa em comparações.
 * @param {unknown} valor
 * @returns {number}
 */
function numeroDaPlanilha(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor ?? '').replace(/R\$|\s/g, '');
  if (!texto) return 0;
  const normal = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normal);
  return Number.isFinite(numero) ? numero : 0;
}

module.exports = { numeroDaPlanilha };
