jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { lerConfig, salvarConfig, limparCache, DEFAULTS } = require('../lib/config-store');

function makeRow(data) {
  return {
    get: (k) => data[k],
    set: jest.fn((k, v) => { data[k] = v; }),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function mockAba(linhas) {
  const rows = linhas.map(makeRow);
  const aba = {
    getRows: jest.fn().mockResolvedValue(rows),
    addRow: jest.fn().mockResolvedValue(undefined),
  };
  obterAba.mockResolvedValue(aba);
  return { aba, rows };
}

beforeEach(() => {
  jest.clearAllMocks();
  limparCache();
});

describe('lerConfig', () => {
  it('devolve os padrões quando a aba está vazia', async () => {
    mockAba([]);
    const cfg = await lerConfig();
    expect(cfg).toEqual(DEFAULTS);
    expect(cfg.precoFoto).toBe(5);
    expect(cfg.prazoPadraoDias).toBe(7);
    expect(cfg.tarja).toBe(true);
    expect(cfg).toMatchObject({
      repassarTaxa: true, distribuicaoTaxa: 50,
      tarifaCartaoPct: 3.99, tarifaCartaoFixo: 0.39, tarifaPixPct: 1.19, tarifaPixFixo: 0,
    });
  });

  it('lê as tarifas e o repasse da planilha', async () => {
    mockAba([
      { Chave: 'tarifaCartaoPct', Valor: '4,2' },
      { Chave: 'tarifaPixFixo', Valor: '0,10' },
      { Chave: 'repassarTaxa', Valor: 'NAO' },
      { Chave: 'distribuicaoTaxa', Valor: '30' },
    ]);
    const cfg = await lerConfig();
    expect(cfg).toMatchObject({ tarifaCartaoPct: 4.2, tarifaPixFixo: 0.1, repassarTaxa: false, distribuicaoTaxa: 30 });
  });

  it('recusa tarifa absurda e distribuição fora de 0 a 100', async () => {
    mockAba([]);
    await expect(salvarConfig('tarifaCartaoPct', 90, 'x')).rejects.toThrow();
    await expect(salvarConfig('distribuicaoTaxa', 101, 'x')).rejects.toThrow();
    await expect(salvarConfig('distribuicaoTaxa', 33.5, 'x')).rejects.toThrow();
  });

  it('sobrescreve o padrão com o valor da planilha, convertendo o tipo', async () => {
    mockAba([
      { Chave: 'precoFoto', Valor: '7,50' },
      { Chave: 'tarja', Valor: 'NAO' },
      { Chave: 'prazoPadraoDias', Valor: '3' },
    ]);
    const cfg = await lerConfig();
    expect(cfg.precoFoto).toBe(7.5);
    expect(cfg.tarja).toBe(false);
    expect(cfg.prazoPadraoDias).toBe(3);
  });

  it('ignora valor inválido e chave desconhecida, mantendo o padrão', async () => {
    mockAba([
      { Chave: 'precoFoto', Valor: 'abc' },
      { Chave: 'prazoPadraoDias', Valor: '-4' },
      { Chave: 'chaveInventada', Valor: 'x' },
    ]);
    const cfg = await lerConfig();
    expect(cfg.precoFoto).toBe(5);
    expect(cfg.prazoPadraoDias).toBe(7);
    expect(cfg).not.toHaveProperty('chaveInventada');
  });

  it('usa cache e só lê a planilha uma vez dentro do prazo', async () => {
    mockAba([]);
    await lerConfig();
    await lerConfig();
    expect(obterAba).toHaveBeenCalledTimes(1);
  });

  it('guarda só dígitos no whatsapp', async () => {
    mockAba([{ Chave: 'whatsapp', Valor: '+55 (99) 98888-7777' }]);
    const cfg = await lerConfig();
    expect(cfg.whatsapp).toBe('5599988887777');
  });
});

describe('salvarConfig', () => {
  it('atualiza a linha existente e registra quem alterou', async () => {
    const { rows } = mockAba([{ Chave: 'precoFoto', Valor: '5' }]);
    await salvarConfig('precoFoto', 6, 'ana@pascom.org');
    expect(rows[0].set).toHaveBeenCalledWith('Valor', '6');
    expect(rows[0].set).toHaveBeenCalledWith('Por', 'ana@pascom.org');
    expect(rows[0].save).toHaveBeenCalled();
  });

  it('cria a linha quando a chave ainda não existe', async () => {
    const { aba } = mockAba([]);
    await salvarConfig('prazoPadraoDias', 3, 'ana@pascom.org');
    expect(aba.addRow).toHaveBeenCalledWith(expect.objectContaining({
      Chave: 'prazoPadraoDias', Valor: '3', Por: 'ana@pascom.org',
    }));
  });

  it('recusa chave fora da lista', async () => {
    mockAba([]);
    await expect(salvarConfig('gateway', 'mercadopago', 'x')).rejects.toThrow('Chave de configuração inválida');
  });

  it('recusa valor inválido', async () => {
    mockAba([]);
    await expect(salvarConfig('precoFoto', -1, 'x')).rejects.toThrow();
    await expect(salvarConfig('prazoPadraoDias', 400, 'x')).rejects.toThrow();
  });

  it('invalida o cache depois de salvar', async () => {
    mockAba([]);
    await lerConfig();
    await salvarConfig('precoFoto', 6, 'x');
    await lerConfig();
    expect(obterAba).toHaveBeenCalledTimes(3);
  });
});
