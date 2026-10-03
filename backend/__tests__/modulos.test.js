jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { criarAba } = require('../test-utils/fake-sheet');
const {
  MODULOS, lerModulos, salvarModulo, moduloEfetivo, derrubadosPor, limparCacheModulos, RECADO_PADRAO,
} = require('../lib/modulos');
const { exigirModulo } = require('../middleware/modulo');

let aba;
beforeEach(() => {
  jest.clearAllMocks();
  limparCacheModulos();
  aba = criarAba();
  obterAba.mockResolvedValue(aba);
});

describe('lerModulos', () => {
  it('módulo sem linha na planilha nasce ligado, com o recado padrão', async () => {
    const m = await lerModulos();
    expect(m.busca).toMatchObject({ ligado: true, efetivo: true, recado: RECADO_PADRAO });
    expect(Object.keys(m)).toEqual(MODULOS.map((x) => x.chave));
  });

  it('lê Ligado e Recado da planilha', async () => {
    await aba.addRow({ Chave: 'agenda', Ligado: 'NAO', Recado: 'Voltamos na segunda.' });
    const m = await lerModulos();
    expect(m.agenda).toMatchObject({ ligado: false, efetivo: false, recado: 'Voltamos na segunda.' });
  });

  it('cascata: desligar a raiz derruba quem depende dela, mesmo estando "ligado"', async () => {
    await aba.addRow({ Chave: 'busca', Ligado: 'NAO', Recado: '' });
    const m = await lerModulos();
    expect(m.checkout).toMatchObject({ ligado: true, efetivo: false, caiCom: 'Busca e galerias' });
    expect(m.agenda.efetivo).toBe(true);
  });

  it('chave desconhecida na planilha é ignorada', async () => {
    await aba.addRow({ Chave: 'inventado', Ligado: 'NAO', Recado: '' });
    expect(Object.keys(await lerModulos())).not.toContain('inventado');
  });

  it('cache de 30 s', async () => {
    await lerModulos();
    await lerModulos();
    expect(obterAba).toHaveBeenCalledTimes(1);
  });

  it('se a planilha falhar, tudo continua ligado (falha aberta: a venda não para por isso)', async () => {
    obterAba.mockRejectedValue(new Error('Sheets fora do ar'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const m = await lerModulos();
    expect(Object.values(m).every((x) => x.efetivo)).toBe(true);
    expect(await moduloEfetivo('checkout')).toBe(true);
  });
});

describe('salvarModulo', () => {
  it('desliga e liga, criando a linha na primeira vez e atualizando depois', async () => {
    await salvarModulo('agenda', { ligado: false }, 'a@p.org');
    expect(aba.valores()).toHaveLength(1);
    expect(aba.valores()[0]).toMatchObject({ Chave: 'agenda', Ligado: 'NAO' });
    expect((await lerModulos()).agenda.efetivo).toBe(false);
    await salvarModulo('agenda', { ligado: true }, 'a@p.org');
    expect(aba.valores()).toHaveLength(1);
    expect((await lerModulos()).agenda.efetivo).toBe(true);
  });

  it('guarda o recado (sem fórmula de planilha) e recusa o que é longo demais', async () => {
    await salvarModulo('ajuda', { recado: '=HYPERLINK("x")' }, 'a@p.org');
    expect(aba.valores()[0].Recado.startsWith("'")).toBe(true);
    await expect(salvarModulo('ajuda', { recado: 'x'.repeat(201) }, 'a@p.org')).rejects.toThrow();
  });

  it('chave desconhecida e campo extra são recusados', async () => {
    await expect(salvarModulo('painel', { ligado: false }, 'a@p.org')).rejects.toThrow('Módulo desconhecido.');
    await expect(salvarModulo('agenda', { ligado: false, extra: 1 }, 'a@p.org')).rejects.toThrow('Dados inválidos');
  });
});

describe('derrubadosPor', () => {
  it('lista quem cai junto: desligar busca derruba compra; agenda não derruba ninguém', () => {
    expect(derrubadosPor('busca')).toEqual(['Compra de fotos']);
    expect(derrubadosPor('agenda')).toEqual([]);
  });
});

describe('exigirModulo — o servidor barra, não só o menu', () => {
  function executar(chave) {
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const next = jest.fn();
    return exigirModulo(chave)({}, res, next).then(() => ({ res, next }));
  }

  it('deixa passar com o módulo ligado', async () => {
    const { next } = await executar('checkout');
    expect(next).toHaveBeenCalled();
  });

  it('com o módulo desligado responde 503 com o recado e não segue', async () => {
    await aba.addRow({ Chave: 'checkout', Ligado: 'NAO', Recado: 'Vendas pausadas até amanhã.' });
    const { res, next } = await executar('checkout');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Vendas pausadas até amanhã.', modulo: 'checkout' });
  });

  it('desligar a busca também barra a compra', async () => {
    await aba.addRow({ Chave: 'busca', Ligado: 'NAO', Recado: '' });
    const { res } = await executar('checkout');
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
