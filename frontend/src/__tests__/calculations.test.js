import { calcularTotais, CONVENIENCE_FEE, PHOTO_PRICE, SERVICE_FEE } from '../lib/calculations.js';

describe('calcularTotais', () => {
  it('aplica o preco padrao de R$ 10,00 quando necessario', () => {
    expect(calcularTotais([{ id: 'F1' }]).subtotal).toBe(PHOTO_PRICE);
  });

  it('inclui apenas as taxas fixas locais antes da cotacao do meio de pagamento', () => {
    const result = calcularTotais([{ price: 10 }, { price: 10 }]);
    expect(result).toEqual({
      subtotal: 20,
      serviceFee: SERVICE_FEE,
      convenienceFee: CONVENIENCE_FEE,
      preliminaryTotal: 23,
    });
  });
});
