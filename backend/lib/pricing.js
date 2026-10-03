// Valores de reserva. Na venda real o preço da foto e as taxas fixas vêm da aba
// Configuracoes (lib/tarifas.js) e são passados em `base`; estas constantes só valem
// quando ninguém informa nada (testes e uso direto).
const PHOTO_PRICE = 10;
const SERVICE_FEE = 2;
const CONVENIENCE_FEE = 1;
const PAYMENT_METHODS = ['pix', 'credit_card'];

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * @param {number} quantity fotos no carrinho
 * @param {string} method 'pix' ou 'credit_card'
 * @param {{method: string, percentage: number, fixed: number}[]} rules tarifa estimada de cada meio
 * @param {object} [commercial] desconto de cupom/pacote já calculado
 * @param {{unitPrice?: number, serviceFee?: number, convenienceFee?: number}} [base] preço e taxas fixas em vigor
 */
function calculatePricing(quantity, method, rules, commercial = {}, base = {}) {
  if (!PAYMENT_METHODS.includes(method)) throw new Error('Meio de pagamento invalido.');
  const rule = rules.find((item) => item.method === method);
  if (!rule) throw new Error('Pagamento indisponivel ate cadastrar a taxa estimada deste meio.');
  const unitPrice = base.unitPrice ?? PHOTO_PRICE;
  const serviceFee = base.serviceFee ?? SERVICE_FEE;
  const convenienceFee = base.convenienceFee ?? CONVENIENCE_FEE;
  const subtotal = roundMoney(quantity * unitPrice);
  const discountTotal = Math.min(subtotal, roundMoney(commercial.discountTotal || 0));
  const discountedSubtotal = roundMoney(subtotal - discountTotal);
  const feeBase = roundMoney(discountedSubtotal + serviceFee + convenienceFee);
  const percentage = Number(rule.percentage || 0) / 100;
  if (!(percentage >= 0 && percentage < 1)) throw new Error('Taxa administrativa invalida.');
  // The gateway tariff applies to the amount charged, including the
  // processing cost line. Gross-up keeps the estimated net at feeBase.
  const chargedTotal = (feeBase + Number(rule.fixed || 0)) / (1 - percentage);
  const paymentCost = roundMoney(chargedTotal - feeBase);
  return {
    unitPrice,
    subtotal,
    discountedSubtotal,
    totalBeforeDiscount: roundMoney(subtotal + serviceFee + convenienceFee),
    discountTotal,
    discounts: commercial.discounts || { coupon: 0, package: 0, total: discountTotal },
    couponApplied: commercial.couponApplied || null,
    packageApplied: commercial.packageApplied || null,
    serviceFee,
    convenienceFee,
    paymentCost,
    total: roundMoney(feeBase + paymentCost),
    method,
    estimated: true,
  };
}

module.exports = { PHOTO_PRICE, SERVICE_FEE, CONVENIENCE_FEE, PAYMENT_METHODS, calculatePricing };
