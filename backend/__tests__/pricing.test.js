const { calculatePricing } = require('../lib/pricing');

it('calcula foto, taxas fixas e custo estimado configurado', () => {
  const quote = calculatePricing(2, 'pix', [{ method: 'pix', percentage: 1, fixed: 0.5 }]);
  expect(quote.subtotal).toBe(20);
  expect(quote.serviceFee).toBe(2);
  expect(quote.convenienceFee).toBe(1);
  expect(quote.paymentCost).toBe(0.73);
  expect(quote.total).toBe(23.73);
});

it('impede checkout sem regra administrativa ativa', () => {
  expect(() => calculatePricing(1, 'pix', [])).toThrow(/Pagamento indisponivel/);
});
