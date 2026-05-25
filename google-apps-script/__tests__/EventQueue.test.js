const { interpretarNomePasta } = require('../EventQueue');

it('interpreta pasta com categoria e data permitidas', () => {
  expect(interpretarNomePasta('casamento__2026-05-20__joao-e-maria')).toEqual(expect.objectContaining({
    valido: true,
    categoria: 'casamento',
    dataEvento: '2026-05-20',
  }));
});

it('mantem pasta invalida pendente de configuracao', () => {
  expect(interpretarNomePasta('formatura__publica__turma')).toEqual(expect.objectContaining({ valido: false }));
});
