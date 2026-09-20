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

it('remove carimbo de quarentena do titulo ao reprocessar pasta', () => {
  expect(interpretarNomePasta('_ERRO_ordem__2026-05-26__padre-paulo-na-frança_202605261456')).toEqual(expect.objectContaining({
    valido: true,
    titulo: 'Padre Paulo Na França',
  }));
});

it('ignora pastas de envio do Painel Pascom ainda em andamento', () => {
  const { listarEventosNovos } = require('../EventQueue');
  const pastas = [
    { getId: () => 'f1', getName: () => '_ENVIANDO__casamento__2026-05-20__joao-e-maria' },
    { getId: () => 'f2', getName: () => 'crisma__2026-06-01__turma' },
  ];
  let index = 0;
  DriveApp.getFolderById.mockReturnValueOnce({ getFolders: () => ({ hasNext: () => index < pastas.length, next: () => pastas[index++] }) });
  global.getStatusEventoByFolderId = jest.fn().mockReturnValue(null);
  expect(listarEventosNovos()).toEqual([{ folderId: 'f2', nomePasta: 'crisma__2026-06-01__turma', retomada: false }]);
});
