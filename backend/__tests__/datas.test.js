const {
  dataValida, somarDias, somarMeses, diaDaSemana, diasNoMes, hojeSP, faixaDaGrade,
} = require('../lib/datas');

describe('dataValida', () => {
  it('aceita só datas reais no formato AAAA-MM-DD', () => {
    expect(dataValida('2026-10-03')).toBe(true);
    expect(dataValida('2024-02-29')).toBe(true);
    expect(dataValida('2026-02-29')).toBe(false);
    expect(dataValida('2026-13-01')).toBe(false);
    expect(dataValida('03/10/2026')).toBe(false);
    expect(dataValida('')).toBe(false);
    expect(dataValida(undefined)).toBe(false);
  });
});

describe('aritmética de datas (texto, sem fuso)', () => {
  it('somarDias atravessa mês e ano', () => {
    expect(somarDias('2026-10-03', 7)).toBe('2026-10-10');
    expect(somarDias('2026-12-30', 5)).toBe('2027-01-04');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('somarMeses devolve o dia 1 do mês certo', () => {
    expect(somarMeses('2026-10-15', 1)).toBe('2026-11-01');
    expect(somarMeses('2026-12-10', 1)).toBe('2027-01-01');
    expect(somarMeses('2026-01-31', -1)).toBe('2025-12-01');
  });

  it('diaDaSemana (0 = domingo) e diasNoMes', () => {
    expect(diaDaSemana('2026-10-03')).toBe(6); // sábado
    expect(diaDaSemana('2026-10-04')).toBe(0); // domingo
    expect(diasNoMes('2026-02-10')).toBe(28);
    expect(diasNoMes('2024-02-10')).toBe(29);
    expect(diasNoMes('2026-10-01')).toBe(31);
  });
});

describe('hojeSP e faixaDaGrade', () => {
  it('hojeSP usa o dia de São Paulo, não o do UTC', () => {
    expect(hojeSP(new Date('2026-10-04T01:30:00Z'))).toBe('2026-10-03');
    expect(hojeSP(new Date('2026-10-03T15:00:00Z'))).toBe('2026-10-03');
  });

  it('a grade do mês tem 42 dias, começando no domingo anterior ao dia 1', () => {
    expect(faixaDaGrade('2026-10')).toEqual({ de: '2026-09-27', ate: '2026-11-07' });
    expect(faixaDaGrade('2026-02')).toEqual({ de: '2026-02-01', ate: '2026-03-14' });
  });
});
