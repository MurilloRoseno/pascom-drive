const { calculatePricing } = require('../lib/pricing');

it('calcula foto, taxas fixas e custo estimado configurado', () => {
  const quote = calculatePricing(2, 'pix', [{ method: 'pix', percentage: 1, fixed: 0.5 }]);
  expect(quote.subtotal).toBe(20);
  expect(quote.serviceFee).toBe(2);
  expect(quote.convenienceFee).toBe(1);
  expect(quote.paymentCost).toBe(0.74);
  expect(quote.total).toBe(23.74);
});

it('compensa a tarifa percentual aplicada ao valor final cobrado', () => {
  const quote = calculatePricing(4, 'credit_card', [{ method: 'credit_card', percentage: 4.98, fixed: 0 }]);
  expect(quote.paymentCost).toBe(2.25);
  expect(quote.total).toBe(45.25);
});

it('impede checkout sem regra administrativa ativa', () => {
  expect(() => calculatePricing(1, 'pix', [])).toThrow(/Pagamento indisponivel/);
});

it('recusa debito virtual removido do checkout publico', () => {
  expect(() => calculatePricing(1, 'debit_card', [{ method: 'debit_card', percentage: 4.98, fixed: 0 }]))
    .toThrow(/Meio de pagamento invalido/);
});
