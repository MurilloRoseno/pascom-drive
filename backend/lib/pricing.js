const PHOTO_PRICE = 10;
const SERVICE_FEE = 2;
const CONVENIENCE_FEE = 1;
const PAYMENT_METHODS = ['pix', 'debit_card', 'credit_card'];

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function calculatePricing(quantity, method, rules) {
  if (!PAYMENT_METHODS.includes(method)) throw new Error('Meio de pagamento invalido.');
  const rule = rules.find((item) => item.method === method);
  if (!rule) throw new Error('Pagamento indisponivel ate cadastrar a taxa estimada deste meio.');
  const subtotal = roundMoney(quantity * PHOTO_PRICE);
  const feeBase = subtotal + SERVICE_FEE + CONVENIENCE_FEE;
  const percentage = Number(rule.percentage || 0) / 100;
  if (percentage < 0 || percentage >= 1) throw new Error('Taxa administrativa invalida.');
  // The Mercado Pago tariff applies to the amount charged, including the
  // processing cost line. Gross-up keeps the estimated net at feeBase.
  const chargedTotal = (feeBase + Number(rule.fixed || 0)) / (1 - percentage);
  const paymentCost = roundMoney(chargedTotal - feeBase);
  return {
    unitPrice: PHOTO_PRICE,
    subtotal,
    serviceFee: SERVICE_FEE,
    convenienceFee: CONVENIENCE_FEE,
    paymentCost,
    total: roundMoney(feeBase + paymentCost),
    method,
    estimated: true,
  };
}

module.exports = { PHOTO_PRICE, SERVICE_FEE, CONVENIENCE_FEE, PAYMENT_METHODS, calculatePricing };
