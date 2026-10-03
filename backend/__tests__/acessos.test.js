jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { criarAba } = require('../test-utils/fake-sheet');
const {
  temPermissao, permissoesDoPapel, definirMatriz, normalizarPermissoes, PROTEGIDAS,
} = require('../lib/permissions');
const {
  garantirMatriz, listarMatriz, salvarAcesso, limparCacheMatriz,
} = require('../lib/acessos');

let aba;
beforeEach(() => {
  jest.clearAllMocks();
  definirMatriz(null);
  limparCacheMatriz();
  aba = criarAba();
  obterAba.mockResolvedValue(aba);
});
afterAll(() => definirMatriz(null));

describe('normalizarPermissoes — regras da matriz', () => {
  it('criar, editar ou excluir liberam também o "ver" da área', () => {
    expect(new Set(normalizarPermissoes(['agenda.criar']))).toEqual(new Set(['agenda.criar', 'agenda.ver']));
  });

  it('descarta permissão inexistente e as reservadas ao administrador', () => {
    const r = normalizarPermissoes(['agenda.ver', 'inventada.ver', 'modulos.gerenciar', 'acessos.gerenciar', 'agenda.apagar-tudo']);
    expect(r).toEqual(['agenda.ver']);
    expect(PROTEGIDAS).toEqual(['modulos.gerenciar', 'acessos.gerenciar']);
  });
});

describe('matriz salva sobrescreve o padrão', () => {
  it('sem nada salvo vale o padrão', async () => {
    await garantirMatriz();
    expect(temPermissao('foto', 'agenda.ver')).toBe(false);
  });

  it('salvar libera a permissão na hora e grava na planilha com o autor', async () => {
    await salvarAcesso('foto', ['eventos.ver', 'agenda.criar'], 'admin@pascom.org');
    expect(temPermissao('foto', 'agenda.criar')).toBe(true);
    expect(temPermissao('foto', 'agenda.ver')).toBe(true); // implícito
    expect(temPermissao('foto', 'pagamentos.ver')).toBe(false);
    expect(aba.valores()[0]).toMatchObject({ Papel: 'foto', Por: 'admin@pascom.org' });
    expect(aba.valores()[0].Permissoes.split(',')).toEqual(expect.arrayContaining(['agenda.criar', 'agenda.ver', 'eventos.ver']));
  });

  it('salvar de novo atualiza a mesma linha', async () => {
    await salvarAcesso('foto', ['eventos.ver'], 'a@p.org');
    await salvarAcesso('foto', ['eventos.ver', 'categorias.ver'], 'a@p.org');
    expect(aba.valores()).toHaveLength(1);
    expect(temPermissao('foto', 'categorias.ver')).toBe(true);
  });

  it('o administrador é fixo: não aceita edição e nunca perde permissão', async () => {
    await expect(salvarAcesso('admin', [], 'a@p.org')).rejects.toThrow('O administrador sempre tem todas as permissões.');
    aba.linhas.push({ dados: { Papel: 'admin', Permissoes: 'agenda.ver' }, get(k) { return this.dados[k]; }, set() {}, save: async () => {} });
    limparCacheMatriz();
    await garantirMatriz();
    expect(temPermissao('admin', 'pagamentos.editar')).toBe(true);
    expect(temPermissao('admin', 'acessos.gerenciar')).toBe(true);
  });

  it('papel desconhecido é recusado', async () => {
    await expect(salvarAcesso('root', ['agenda.ver'], 'a@p.org')).rejects.toThrow('Papel desconhecido.');
  });

  it('nenhum papel além do admin ganha módulos/acessos, nem se a planilha for editada à mão', async () => {
    aba.linhas.push({ dados: { Papel: 'coord', Permissoes: 'modulos.gerenciar,acessos.gerenciar,agenda.ver' }, get(k) { return this.dados[k]; }, set() {}, save: async () => {} });
    limparCacheMatriz();
    await garantirMatriz();
    expect(temPermissao('coord', 'acessos.gerenciar')).toBe(false);
    expect(temPermissao('coord', 'modulos.gerenciar')).toBe(false);
    expect(temPermissao('coord', 'agenda.ver')).toBe(true);
  });

  it('se a planilha falhar, o painel segue com o padrão em vez de travar todo mundo', async () => {
    obterAba.mockRejectedValue(new Error('Sheets fora do ar'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(garantirMatriz()).resolves.toBeUndefined();
    expect(temPermissao('coord', 'eventos.editar')).toBe(true);
  });

  it('cache de 30 s: duas chamadas leem a planilha uma vez', async () => {
    await garantirMatriz();
    await garantirMatriz();
    expect(obterAba).toHaveBeenCalledTimes(1);
  });
});

describe('listarMatriz e permissoesDoPapel', () => {
  it('lista o efetivo por papel, incluindo o padrão dos que não foram editados', async () => {
    await salvarAcesso('foto', ['eventos.ver'], 'a@p.org');
    const m = await listarMatriz();
    expect(m.foto).toEqual(['eventos.ver']);
    expect(m.coord).toEqual(permissoesDoPapel('coord'));
    expect(m.admin).toHaveLength(28); // todas as permissões existentes
  });
});
