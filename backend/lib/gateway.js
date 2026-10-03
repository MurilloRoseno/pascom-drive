// Qual gateway recebe os pagamentos novos. Vem só do ambiente do servidor (PAYMENT_GATEWAY):
// o navegador nunca escolhe nem influencia. Sem a variável, mantém o Mercado Pago, que é o
// que já roda em produção, até a Stripe estar configurada no ambiente.
const GATEWAYS = ['stripe', 'mercadopago'];

/** @returns {'stripe'|'mercadopago'} */
function gatewayAtivo() {
  const valor = String(process.env.PAYMENT_GATEWAY || '').trim().toLowerCase();
  return GATEWAYS.includes(valor) ? valor : 'mercadopago';
}

module.exports = { gatewayAtivo, GATEWAYS };
