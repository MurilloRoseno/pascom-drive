// O servidor diz qual gateway recebe o pagamento (pricing.gateway); as telas só mostram o nome.
const NOMES = { stripe: 'Stripe', mercadopago: 'Mercado Pago' };
const DE = { stripe: 'da Stripe', mercadopago: 'do Mercado Pago' };

/** @param {string} [gateway] */
export const nomeDoGateway = (gateway) => NOMES[gateway] || '';

/** "Pagamento processado no ambiente protegido da Stripe." */
export const frasePagamentoSeguro = (gateway) => `Pagamento processado no ambiente protegido ${DE[gateway] || 'do provedor de pagamento'}.`;

/** Texto do botão de pagar (e enquanto abre a página do provedor). */
export function textoBotaoPagar(gateway, abrindo = false) {
  const nome = nomeDoGateway(gateway);
  if (abrindo) return nome ? `Abrindo ${nome}...` : 'Abrindo o pagamento...';
  return nome ? `Pagar com ${nome}` : 'Ir para o pagamento';
}
