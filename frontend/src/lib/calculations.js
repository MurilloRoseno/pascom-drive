/**
 * @param {number} subtotal
 * @returns {number} valor da taxa Mercado Pago em reais
 */
export function calcularTaxa(subtotal) {
  return subtotal * 0.0299 + 0.30;
}

/**
 * @param {{ price: number }[]} fotos
 * @returns {{ subtotal: number, taxa: number, total: number }}
 */
export function calcularTotais(fotos) {
  const subtotal = fotos.reduce((acc, f) => acc + f.price, 0);
  const taxa = calcularTaxa(subtotal);
  return { subtotal, taxa, total: subtotal + taxa };
}
