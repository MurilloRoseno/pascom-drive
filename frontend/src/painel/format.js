/**
 * Valor em centavos -> "R$ 5,00". O servidor é quem calcula; aqui só se formata.
 * @param {number} centavos
 */
export function formatarReais(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Número em reais (como vem da config) -> "R$ 5,00". */
export function formatarReaisDeValor(valor) {
  return formatarReais(Math.round(Number(valor || 0) * 100));
}
