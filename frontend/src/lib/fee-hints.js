const METHOD_LABELS = { pix: 'Pix', credit_card: 'cartão de crédito' };

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

// Explica o que e cada taxa a partir das tarifas devolvidas pelo servidor.
export function feeHints(pricing) {
  if (!pricing?.fees) return { service: '', convenience: '' };
  const percentage = String(pricing.fees.percentage).replace('.', ',');
  const method = METHOD_LABELS[pricing.method] || 'meio escolhido';
  return {
    service: `Percentual que o Stripe cobra para processar o pagamento: ${percentage}% do valor no ${method}.`,
    convenience: Number(pricing.fees.fixed) > 0
      ? `Valor fixo que o Stripe cobra por transação no cartão: ${money(pricing.fees.fixed)}.`
      : 'Valor fixo por transação do Stripe: existe só no cartão. No Pix é R$ 0,00.',
  };
}
