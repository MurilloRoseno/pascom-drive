const { numeroDaPlanilha } = require('../lib/numero-planilha');

describe('numeroDaPlanilha (a planilha devolve números no formato brasileiro)', () => {
  it.each([
    ['13,95', 13.95],
    ['0,99', 0.99],
    ['1.234,56', 1234.56],
    ['R$ 13,95', 13.95],
    ['  8,74 ', 8.74],
    ['13.95', 13.95],
    ['10', 10],
    ['0', 0],
    [13.95, 13.95],
    [7, 7],
  ])('%j -> %s', (entrada, esperado) => {
    expect(numeroDaPlanilha(entrada)).toBe(esperado);
  });

  it.each([[''], [null], [undefined], ['abc'], ['--'], [NaN], [Infinity], ['1,2,3x']])('%j não vira NaN: vira 0', (entrada) => {
    expect(numeroDaPlanilha(entrada)).toBe(0);
  });

  it('o total lido da planilha bate com o valor cobrado, em centavos (o caso do webhook)', () => {
    expect(Math.round(numeroDaPlanilha('13,95') * 100)).toBe(1395);
    expect(Math.round(numeroDaPlanilha('8,74') * 100)).toBe(874);
  });
});
