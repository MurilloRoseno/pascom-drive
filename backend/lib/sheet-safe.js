/**
 * Evita injeção de fórmula: célula que começa com `=`, `+`, `-` ou `@` (ou com
 * tabulação/retorno) vira texto com apóstrofo na frente. Use em todo valor vindo
 * de fora antes de gravar na planilha.
 * @param {unknown} valor
 * @returns {string}
 */
function neutralizarCelula(valor) {
  const texto = String(valor ?? '');
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

module.exports = { neutralizarCelula };
