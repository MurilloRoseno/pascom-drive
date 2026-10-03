jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { registrarAuditoria, ultimasAlteracoes } = require('../lib/audit');

function mockAba(linhas = []) {
  const rows = linhas.map((d) => ({ get: (k) => d[k] }));
  const aba = {
    getRows: jest.fn().mockResolvedValue(rows),
    addRow: jest.fn().mockResolvedValue(undefined),
  };
  obterAba.mockResolvedValue(aba);
  return aba;
}

beforeEach(() => jest.clearAllMocks());

describe('registrarAuditoria', () => {
  it('acrescenta uma linha com horário de São Paulo, autor e mensagem', async () => {
    const aba = mockAba();
    await registrarAuditoria({ quem: 'ana@pascom.org', mensagem: 'Preço por foto: R$ 10,00 → R$ 5,00' });
    expect(aba.addRow).toHaveBeenCalledTimes(1);
    const linha = aba.addRow.mock.calls[0][0];
    expect(linha.Quem).toBe('ana@pascom.org');
    expect(linha.Mensagem).toBe('Preço por foto: R$ 10,00 → R$ 5,00');
    expect(linha.Quando).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('neutraliza fórmula de planilha na mensagem e no autor', async () => {
    const aba = mockAba();
    await registrarAuditoria({ quem: '=HYPERLINK("x")', mensagem: '+cmd|calc' });
    const linha = aba.addRow.mock.calls[0][0];
    expect(linha.Quem.startsWith("'")).toBe(true);
    expect(linha.Mensagem.startsWith("'")).toBe(true);
  });

  it('não derruba a operação principal se a planilha falhar', async () => {
    obterAba.mockRejectedValue(new Error('sheets fora do ar'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(registrarAuditoria({ quem: 'a', mensagem: 'b' })).resolves.toBe(false);
    spy.mockRestore();
  });
});

describe('ultimasAlteracoes', () => {
  it('devolve as últimas N, da mais nova para a mais antiga', async () => {
    mockAba([
      { Quando: '01/10/2026 09:00:00', Quem: 'a', Mensagem: 'um' },
      { Quando: '02/10/2026 09:00:00', Quem: 'b', Mensagem: 'dois' },
      { Quando: '03/10/2026 09:00:00', Quem: 'c', Mensagem: 'tres' },
    ]);
    const r = await ultimasAlteracoes(2);
    expect(r.map((x) => x.mensagem)).toEqual(['tres', 'dois']);
    expect(r[0]).toEqual({ quando: '03/10/2026 09:00:00', quem: 'c', mensagem: 'tres' });
  });
});
