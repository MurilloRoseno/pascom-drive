jest.mock('../lib/config-store', () => ({
  ...jest.requireActual('../lib/config-store'),
  lerConfig: jest.fn(),
  salvarConfig: jest.fn(),
}));
jest.mock('../lib/eventos-admin', () => ({ listarEventosAdmin: jest.fn() }));
jest.mock('../lib/modulos', () => ({ lerModulos: jest.fn() }));

const { lerConfig, salvarConfig, DEFAULTS } = require('../lib/config-store');
const { listarEventosAdmin } = require('../lib/eventos-admin');
const { lerModulos } = require('../lib/modulos');
const {
  BLOCOS_PADRAO, interpretarBlocos, validarHome, salvarHome, lerHome, homePublica,
} = require('../lib/home');

const ligados = {
  busca: { efetivo: true }, checkout: { efetivo: true }, agenda: { efetivo: true }, ajuda: { efetivo: true },
};
const IDS_PADRAO = ['categorias', 'destaque', 'eventos', 'missao', 'agenda', 'depoimentos', 'contato'];
const comDepoimento = JSON.stringify([{ autor: 'Ana', funcao: '', texto: 'Muito bom.' }]);

beforeEach(() => {
  jest.clearAllMocks();
  lerConfig.mockResolvedValue({ ...DEFAULTS });
  lerModulos.mockResolvedValue(ligados);
  listarEventosAdmin.mockResolvedValue([
    { eventoId: 'MISSA', nome: 'Missa dominical', estado: 'no_ar' },
    { eventoId: 'RASC', nome: 'Rascunho', estado: 'rascunho' },
  ]);
});

describe('interpretarBlocos', () => {
  it('sem nada salvo, devolve os blocos padrão na ordem de hoje', () => {
    expect(interpretarBlocos('').map((b) => b.id)).toEqual(IDS_PADRAO);
    expect(BLOCOS_PADRAO.every((b) => b.ligado)).toBe(true);
  });

  it('respeita a ordem, os títulos e o liga/desliga salvos; o que falta entra no fim', () => {
    const salvo = JSON.stringify([{ id: 'agenda', titulo: 'Próximas missas', ligado: true }, { id: 'eventos', titulo: 'Fotos', ligado: false }]);
    const r = interpretarBlocos(salvo);
    expect(r.slice(0, 2)).toEqual([{ id: 'agenda', titulo: 'Próximas missas', ligado: true }, { id: 'eventos', titulo: 'Fotos', ligado: false }]);
    expect(r).toHaveLength(IDS_PADRAO.length);
  });

  it('JSON quebrado, id desconhecido ou repetido não derrubam o site', () => {
    expect(interpretarBlocos('{não é json')).toEqual(BLOCOS_PADRAO);
    const r = interpretarBlocos(JSON.stringify([
      { id: 'inventado', titulo: 'x', ligado: true }, { id: 'agenda', titulo: 'A', ligado: true }, { id: 'agenda', titulo: 'B', ligado: true },
    ]));
    expect(r.filter((b) => b.id === 'agenda')).toHaveLength(1);
    expect(r.find((b) => b.id === 'agenda').titulo).toBe('A');
    expect(r.some((b) => b.id === 'inventado')).toBe(false);
  });

  it('ids antigos de outro desenho (busca, recentes...) são ignorados', () => {
    expect(interpretarBlocos(JSON.stringify([{ id: 'recentes', titulo: 'x', ligado: true }])).map((b) => b.id)).toEqual(IDS_PADRAO);
  });
});

describe('validarHome', () => {
  const todos = () => BLOCOS_PADRAO.map((b) => ({ ...b }));

  it('aceita a lista completa e normaliza os títulos', async () => {
    const blocos = todos();
    blocos[0].titulo = '  Sacramentos   e festas ';
    expect((await validarHome({ blocos, destaque: '' })).blocos[0].titulo).toBe('Sacramentos e festas');
  });

  it.each([
    ['bloco faltando', (b) => b.slice(1), 'Dados inválidos'],
    ['bloco repetido', (b) => [...b, b[0]], 'Dados inválidos'],
    ['id inventado', (b) => [{ id: 'hack', titulo: 'x', ligado: true }, ...b.slice(1)], 'Dados inválidos'],
    ['título vazio', (b) => [{ ...b[0], titulo: ' ' }, ...b.slice(1)], 'Cada bloco precisa de um título.'],
    ['título longo', (b) => [{ ...b[0], titulo: 'x'.repeat(81) }, ...b.slice(1)], 'O título pode ter até 80 caracteres.'],
  ])('recusa %s', async (_n, mutar, msg) => {
    await expect(validarHome({ blocos: mutar(todos()), destaque: '' })).rejects.toThrow(msg);
  });

  it('o destaque precisa ser um evento que está no ar', async () => {
    await expect(validarHome({ blocos: todos(), destaque: 'RASC' })).rejects.toThrow('Escolha um evento que esteja no ar.');
    await expect(validarHome({ blocos: todos(), destaque: 'NAO_EXISTE' })).rejects.toThrow('Escolha um evento que esteja no ar.');
    expect((await validarHome({ blocos: todos(), destaque: 'MISSA' })).destaque).toBe('MISSA');
    expect((await validarHome({ blocos: todos(), destaque: '' })).destaque).toBe('');
  });

  it('campo extra no corpo é recusado', async () => {
    await expect(validarHome({ blocos: todos(), destaque: '', extra: 1 })).rejects.toThrow('Dados inválidos');
  });
});

describe('salvarHome', () => {
  it('grava os blocos como JSON e o destaque, com o autor', async () => {
    await salvarHome({ blocos: BLOCOS_PADRAO.map((b) => ({ ...b })), destaque: 'MISSA' }, 'a@p.org');
    const [[chave1, valor1, por1], [chave2, valor2]] = salvarConfig.mock.calls;
    expect(chave1).toBe('homeBlocos');
    expect(JSON.parse(valor1)).toHaveLength(IDS_PADRAO.length);
    expect(por1).toBe('a@p.org');
    expect([chave2, valor2]).toEqual(['homeDestaque', 'MISSA']);
  });

  it('não grava nada se a validação falhar', async () => {
    await expect(salvarHome({ blocos: [], destaque: '' }, 'a@p.org')).rejects.toThrow();
    expect(salvarConfig).not.toHaveBeenCalled();
  });
});

describe('lerHome e homePublica', () => {
  it('lerHome devolve blocos e destaque', async () => {
    lerConfig.mockResolvedValue({ ...DEFAULTS, homeBlocos: JSON.stringify(BLOCOS_PADRAO), homeDestaque: 'MISSA' });
    const h = await lerHome();
    expect(h.blocos).toHaveLength(IDS_PADRAO.length);
    expect(h.destaque).toBe('MISSA');
  });

  it('o padrão público não muda a Home de hoje: sem destaque e sem depoimentos esses dois blocos somem', async () => {
    expect((await homePublica()).blocos.map((b) => b.id)).toEqual(['categorias', 'eventos', 'missao', 'agenda', 'contato']);
  });

  it('só blocos ligados e cujo módulo está no ar', async () => {
    const salvo = BLOCOS_PADRAO.map((b) => (b.id === 'eventos' ? { ...b, ligado: false } : b));
    lerConfig.mockResolvedValue({ ...DEFAULTS, homeBlocos: JSON.stringify(salvo), homeDestaque: 'MISSA', homeDepoimentos: comDepoimento });
    lerModulos.mockResolvedValue({ ...ligados, agenda: { efetivo: false } });
    expect((await homePublica()).blocos.map((b) => b.id)).toEqual(['categorias', 'destaque', 'missao', 'depoimentos', 'contato']);
  });

  it('galerias fora do ar derrubam categorias, destaque e eventos, mas não missão nem contato', async () => {
    lerConfig.mockResolvedValue({ ...DEFAULTS, homeDestaque: 'MISSA' });
    lerModulos.mockResolvedValue({ ...ligados, busca: { efetivo: false } });
    expect((await homePublica()).blocos.map((b) => b.id)).toEqual(['missao', 'agenda', 'contato']);
  });

  it('depoimentos aparecem quando existem', async () => {
    lerConfig.mockResolvedValue({ ...DEFAULTS, homeDepoimentos: comDepoimento });
    expect((await homePublica()).blocos.map((b) => b.id)).toContain('depoimentos');
  });

  it('destaque só aparece se o evento ainda estiver no ar; entra com o nome', async () => {
    lerConfig.mockResolvedValue({ ...DEFAULTS, homeDestaque: 'MISSA' });
    expect((await homePublica()).destaque).toEqual({ eventoId: 'MISSA', nome: 'Missa dominical' });
    listarEventosAdmin.mockResolvedValue([{ eventoId: 'MISSA', nome: 'Missa dominical', estado: 'arquivado' }]);
    const h = await homePublica();
    expect(h.destaque).toBeNull();
    expect(h.blocos.map((b) => b.id)).not.toContain('destaque');
  });
});
