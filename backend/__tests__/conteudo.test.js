jest.mock('../lib/config-store', () => ({
  ...jest.requireActual('../lib/config-store'),
  lerConfig: jest.fn(),
  salvarConfig: jest.fn().mockResolvedValue(),
}));

const { lerConfig, salvarConfig, DEFAULTS } = require('../lib/config-store');
const { publicarConteudo, lerConteudo, conteudoDoSite } = require('../lib/conteudo');

beforeEach(() => {
  jest.clearAllMocks();
  lerConfig.mockResolvedValue({ ...DEFAULTS });
});

describe('conteudoDoSite', () => {
  it('sem nada cadastrado: o site continua igual ao de hoje e as seções novas da Home ficam vazias (nada inventado)', () => {
    const c = conteudoDoSite(DEFAULTS);
    expect(c).toMatchObject({
      nome: 'Paróquia São Rafael',
      cidade: 'Açailândia – MA',
      email: 'paroquiasaorafael@hotmail.com',
      whatsapp: '5599991646063',
      horario: 'Terça a sexta: 8h30 às 11h',
      referencia: 'Filipenses 4:13',
      missao: null,
      numeros: [],
      depoimentos: [],
    });
  });

  it('apagar um campo no painel o esconde (em branco é escolha, não volta ao padrão)', () => {
    expect(conteudoDoSite({ ...DEFAULTS, siteInstagram: '' }).instagram).toBe('');
  });

  it('lê as listas gravadas e ignora JSON quebrado ou fora da regra, sem derrubar o site', () => {
    const ok = conteudoDoSite({
      ...DEFAULTS,
      homeNumeros: JSON.stringify([{ valor: '40', rotulo: 'Anos' }]),
      homeDepoimentos: '{quebrado',
      homeMissao: JSON.stringify({ titulo: '', paragrafos: [] }),
    });
    expect(ok.numeros).toEqual([{ valor: '40', rotulo: 'Anos' }]);
    expect(ok.depoimentos).toEqual([]);
    expect(ok.missao).toBeNull();
  });

  it('nunca devolve preço, tarifas nem chaves internas', () => {
    const c = conteudoDoSite({ ...DEFAULTS, precoFoto: 777, tarifaCartaoPct: 888 });
    expect(JSON.stringify(c)).not.toMatch(/precoFoto|tarifa|777|888/);
  });
});

describe('publicarConteudo', () => {
  it('grava só o que veio, com o e-mail de quem publicou', async () => {
    const r = await publicarConteudo({ nome: 'Paróquia São Rafael Arcanjo', horario: 'Terça a sexta: 8h30 às 11h' }, 'ana@pascom.org');
    expect(r.alterados).toEqual(['Nome', 'Horário']);
    expect(salvarConfig).toHaveBeenCalledWith('siteNome', 'Paróquia São Rafael Arcanjo', 'ana@pascom.org');
    expect(salvarConfig).toHaveBeenCalledWith('siteHorario', 'Terça a sexta: 8h30 às 11h', 'ana@pascom.org');
  });

  it('tudo ou nada: um campo inválido impede a gravação dos outros e diz qual é', async () => {
    await expect(publicarConteudo({ nome: 'Nome válido', email: 'isso-nao-e-email' }, 'x')).rejects.toThrow(/^E-mail:/);
    expect(salvarConfig).not.toHaveBeenCalled();
  });

  it('recusa campo que não é conteúdo do site (preço, tarifas, cor, chave interna)', async () => {
    for (const intruso of ['precoFoto', 'tarifaPixPct', 'cor', 'siteNome', 'homeBlocos']) {
      await expect(publicarConteudo({ [intruso]: '1' }, 'x')).rejects.toThrow('Campo não permitido.');
    }
    expect(salvarConfig).not.toHaveBeenCalled();
  });

  it('não aceita pedido vazio', async () => {
    await expect(publicarConteudo({}, 'x')).rejects.toThrow('Nada para publicar.');
  });

  it('barra texto que viraria fórmula na planilha', async () => {
    await expect(publicarConteudo({ endereco: '=HYPERLINK("http://x")' }, 'x')).rejects.toThrow(/Endereço: .*= \+ - ou @/);
  });

  it('rede social só no site da própria rede', async () => {
    await expect(publicarConteudo({ instagram: 'https://outro-site.com/x' }, 'x')).rejects.toThrow(/Instagram: .*Instagram/);
    await publicarConteudo({ instagram: 'https://instagram.com/paroquia.sao.rafael/' }, 'x');
    expect(salvarConfig).toHaveBeenCalledWith('siteInstagram', 'https://instagram.com/paroquia.sao.rafael/', 'x');
  });
});

describe('missão, números e depoimentos', () => {
  it('guardam JSON validado e limpo; lista vazia limpa a seção', async () => {
    await publicarConteudo({
      missao: { titulo: '  Servir  em comunhão ', paragrafos: ['Uma comunidade viva.'] },
      numeros: [{ valor: '40+', rotulo: 'Anos de história' }],
      depoimentos: [],
    }, 'x');
    const gravado = Object.fromEntries(salvarConfig.mock.calls.map(([k, v]) => [k, v]));
    expect(JSON.parse(gravado.homeMissao)).toEqual({ titulo: 'Servir em comunhão', paragrafos: ['Uma comunidade viva.'] });
    expect(JSON.parse(gravado.homeNumeros)).toEqual([{ valor: '40+', rotulo: 'Anos de história' }]);
    expect(gravado.homeDepoimentos).toBe('');
  });

  it('null limpa a missão', async () => {
    await publicarConteudo({ missao: null }, 'x');
    expect(salvarConfig).toHaveBeenCalledWith('homeMissao', '', 'x');
  });

  it.each([
    [{ missao: { titulo: 'X', paragrafos: [] } }, /Missão: .*parágrafo/],
    [{ missao: { titulo: 'X', paragrafos: ['a', 'b', 'c', 'd'] } }, /Missão: .*3 parágrafos/],
    [{ numeros: [1, 2, 3, 4, 5].map((n) => ({ valor: String(n), rotulo: 'x' })) }, /Números: .*4 números/],
    [{ depoimentos: [{ autor: 'Ana', funcao: '', texto: 'x'.repeat(281) }] }, /Depoimentos: /],
    [{ depoimentos: [{ autor: 'Ana', funcao: '', texto: 'Bom', extra: 1 }] }, /Depoimentos: /],
  ])('recusa %j', async (entrada, erro) => {
    await expect(publicarConteudo(entrada, 'x')).rejects.toThrow(erro);
    expect(salvarConfig).not.toHaveBeenCalled();
  });

  it('lerConteudo devolve o que foi gravado', async () => {
    lerConfig.mockResolvedValue({ ...DEFAULTS, homeDepoimentos: JSON.stringify([{ autor: 'Ana', funcao: '', texto: 'Muito bom.' }]) });
    expect((await lerConteudo()).depoimentos).toEqual([{ autor: 'Ana', funcao: '', texto: 'Muito bom.' }]);
  });
});
