import { calcularTaxa, calcularTotais } from '../lib/calculations.js';

describe('calcularTaxa', () => {
  it('calcula taxa correta para R$100', () => {
    expect(calcularTaxa(100)).toBeCloseTo(3.29);
  });
  it('retorna R$0,30 para subtotal zero', () => {
    expect(calcularTaxa(0)).toBeCloseTo(0.30);
  });
  it('calcula taxa proporcional', () => {
    expect(calcularTaxa(50)).toBeCloseTo(1.795);
  });
});

describe('calcularTotais', () => {
  it('retorna subtotal 0 e taxa 0,30 para array vazio', () => {
    const r = calcularTotais([]);
    expect(r.subtotal).toBe(0);
    expect(r.taxa).toBeCloseTo(0.30);
    expect(r.total).toBeCloseTo(0.30);
  });
  it('soma preços corretamente', () => {
    const fotos = [{ price: 25 }, { price: 20 }];
    expect(calcularTotais(fotos).subtotal).toBe(45);
  });
  it('total é subtotal + taxa', () => {
    const fotos = [{ price: 100 }];
    const { subtotal, taxa, total } = calcularTotais(fotos);
    expect(total).toBeCloseTo(subtotal + taxa);
  });
});
