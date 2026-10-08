const PHOTO_PRICE = 5;
const PAYMENT_METHODS = ['pix', 'credit_card'];
// Tabela publica do Stripe Brasil. Unica fonte das tarifas: percentual sobre o
// valor cobrado + valor fixo por transacao, por meio de pagamento.
const STRIPE_FEES = {
  pix: { percentage: 1.19, fixed: 0 },
  credit_card: { percentage: 3.99, fixed: 0.39 },
};
const STRIPE_MIN_CHARGE = 0.5;

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

// The Stripe tariff applies to the amount charged, including the fee lines.
// Gross-up keeps the estimated net at the photos amount.
function chargedTotal(base, fee) {
  return roundMoney((base + fee.fixed) / (1 - fee.percentage / 100));
}

function calculatePricing(quantity, method, commercial = {}) {
  if (!PAYMENT_METHODS.includes(method)) throw new Error('Meio de pagamento invalido.');
  const fee = STRIPE_FEES[method];
  const subtotal = roundMoney(quantity * PHOTO_PRICE);
  const discountTotal = Math.min(subtotal, roundMoney(commercial.discountTotal || 0));
  const discountedSubtotal = roundMoney(subtotal - discountTotal);
  const total = chargedTotal(discountedSubtotal, fee);
  if (total < STRIPE_MIN_CHARGE) throw new Error('Pagamento indisponivel: valor abaixo do minimo aceito pelo Stripe.');
  return {
    unitPrice: PHOTO_PRICE,
    subtotal,
    discountedSubtotal,
    totalBeforeDiscount: chargedTotal(subtotal, fee),
    discountTotal,
    discounts: commercial.discounts || { coupon: 0, package: 0, total: discountTotal },
    couponApplied: commercial.couponApplied || null,
    packageApplied: commercial.packageApplied || null,
    // Taxa de servico = parte percentual do Stripe; comodidade = parte fixa.
    serviceFee: roundMoney(total - discountedSubtotal - fee.fixed),
    convenienceFee: fee.fixed,
    paymentCost: 0,
    fees: { percentage: fee.percentage, fixed: fee.fixed },
    total,
    method,
    estimated: true,
  };
}

module.exports = { PHOTO_PRICE, PAYMENT_METHODS, STRIPE_FEES, STRIPE_MIN_CHARGE, calculatePricing, chargedTotal, roundMoney };
