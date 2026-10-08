const { calculatePricing, PHOTO_PRICE, STRIPE_FEES } = require('../lib/pricing');

it('cobra R$ 5,00 por foto', () => {
  expect(PHOTO_PRICE).toBe(5);
  expect(calculatePricing(3, 'pix').subtotal).toBe(15);
});

it('calcula a taxa do Stripe no Pix apenas com a parte percentual', () => {
  const quote = calculatePricing(2, 'pix');
  expect(quote.subtotal).toBe(10);
  expect(quote.serviceFee).toBe(0.12);
  expect(quote.convenienceFee).toBe(0);
  expect(quote.paymentCost).toBe(0);
  expect(quote.total).toBe(10.12);
  expect(quote.fees).toEqual(STRIPE_FEES.pix);
});

it('separa percentual e valor fixo do Stripe no cartao', () => {
  const quote = calculatePricing(2, 'credit_card');
  expect(quote.serviceFee).toBe(0.43);
  expect(quote.convenienceFee).toBe(0.39);
  expect(quote.total).toBe(10.82);
  expect(quote.fees).toEqual(STRIPE_FEES.credit_card);
});

it('compensa a tarifa aplicada ao valor final cobrado', () => {
  const quote = calculatePricing(4, 'credit_card');
  const stripeFee = quote.total * (STRIPE_FEES.credit_card.percentage / 100) + STRIPE_FEES.credit_card.fixed;
  expect(quote.total - stripeFee).toBeCloseTo(quote.subtotal, 1);
});

it('aplica as taxas sobre o subtotal com desconto', () => {
  const quote = calculatePricing(4, 'pix', { discountTotal: 10 });
  expect(quote.discountedSubtotal).toBe(10);
  expect(quote.total).toBe(10.12);
  expect(quote.totalBeforeDiscount).toBe(20.24);
});

it('impede checkout abaixo do valor minimo do Stripe', () => {
  expect(() => calculatePricing(1, 'pix', { discountTotal: 5 })).toThrow(/Pagamento indisponivel/);
});

it('recusa debito virtual removido do checkout publico', () => {
  expect(() => calculatePricing(1, 'debit_card')).toThrow(/Meio de pagamento invalido/);
});
