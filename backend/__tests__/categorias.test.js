jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { criarAba } = require('../test-utils/fake-sheet');
const {
  slugify, listarCategorias, criarCategoria, atualizarCategoria,
  moverCategoria, removerCategoria, slugsAtivos, CATEGORIA_PADRAO,
} = require('../lib/categorias');

let categorias;
let eventos;

function cat(id, nome, tipo, ordem, ativo = 'SIM') {
  return { Id: id, Nome: nome, Tipo: tipo, Ordem: String(ordem), Ativo: ativo };
}

beforeEach(() => {
  categorias = criarAba([
    cat('celebracoes', 'Celebrações', 'celebracao', 1),
    cat('batismo', 'Batismo', 'sacramento', 2),
    cat('crisma', 'Crisma', 'sacramento', 3),
  ]);
  eventos = criarAba([
    { EventoID: 'E1', Categoria: 'batismo' },
    { EventoID: 'E2', Categoria: 'batismo' },
    { EventoID: 'E3', Categoria: '' },
  ]);
  obterAba.mockImplementation(async (titulo) => (titulo === 'Categorias' ? categorias : eventos));
});

describe('slugify', () => {
  it('tira acentos, usa minúsculas e troca o resto por hífen', () => {
    expect(slugify('Profissão de Fé')).toBe('profissao-de-fe');
    expect(slugify('  Unção dos Enfermos!! ')).toBe('uncao-dos-enfermos');
  });
});

describe('listarCategorias', () => {
  it('conta eventos por categoria; evento sem categoria cai na padrão', async () => {
    const lista = await listarCategorias();
    const por = Object.fromEntries(lista.map((c) => [c.id, c.eventos]));
    expect(por).toEqual({ celebracoes: 1, batismo: 2, crisma: 0 });
    expect(lista.find((c) => c.id === CATEGORIA_PADRAO).padrao).toBe(true);
  });

  it('esconde as ocultas e as removidas por padrão', async () => {
    categorias = criarAba([
      cat('celebracoes', 'Celebrações', 'celebracao', 1),
      cat('crisma', 'Crisma', 'sacramento', 2, 'NAO'),
      cat('velha', 'Velha', 'sacramento', 3, 'REMOVIDA'),
    ]);
    expect((await listarCategorias()).map((c) => c.id)).toEqual(['celebracoes']);
    expect((await listarCategorias({ incluirOcultas: true })).map((c) => c.id)).toEqual(['celebracoes', 'crisma']);
  });

  it('semeia as categorias iniciais quando a aba está vazia', async () => {
    categorias = criarAba([]);
    const lista = await listarCategorias();
    expect(lista.map((c) => c.id)).toEqual(
      expect.arrayContaining(['celebracoes', 'batismo', 'eucaristia', 'crisma', 'casamento', 'uncao-dos-enfermos', 'ordem']),
    );
    expect(categorias.valores().length).toBe(lista.length);
  });
});

describe('criarCategoria', () => {
  it('cria com slug, tipo e a próxima ordem', async () => {
    const c = await criarCategoria({ nome: 'Profissão de Fé', tipo: 'sacramento' });
    expect(c).toMatchObject({ id: 'profissao-de-fe', nome: 'Profissão de Fé', tipo: 'sacramento', ordem: 4, ativo: true });
    expect(categorias.valores().at(-1)).toMatchObject({ Id: 'profissao-de-fe', Ativo: 'SIM' });
  });

  it('recusa nome vazio, curto demais ou repetido (ignorando acento e caixa)', async () => {
    await expect(criarCategoria({ nome: ' ', tipo: 'sacramento' })).rejects.toThrow('Informe o nome da categoria.');
    await expect(criarCategoria({ nome: 'BATISMO', tipo: 'sacramento' })).rejects.toThrow('Essa categoria já existe.');
    await expect(criarCategoria({ nome: 'Crísma', tipo: 'sacramento' })).rejects.toThrow('Essa categoria já existe.');
  });

  it('recusa tipo desconhecido e neutraliza fórmula no nome', async () => {
    await expect(criarCategoria({ nome: 'Nova', tipo: 'outro' })).rejects.toThrow('Tipo inválido');
    await criarCategoria({ nome: '=1+1 Teste', tipo: 'celebracao' });
    expect(categorias.valores().at(-1).Nome.startsWith("'")).toBe(true);
  });

  it('reaproveita o slug de categoria removida sem colidir', async () => {
    categorias = criarAba([cat('celebracoes', 'Celebrações', 'celebracao', 1), cat('crisma', 'Crisma', 'sacramento', 2, 'REMOVIDA')]);
    const c = await criarCategoria({ nome: 'Crisma', tipo: 'sacramento' });
    expect(c.id).toBe('crisma-2');
  });
});

describe('atualizarCategoria', () => {
  it('renomeia sem mudar o slug', async () => {
    await atualizarCategoria('batismo', { nome: 'Batismo de Adultos' });
    expect(categorias.valores()[1]).toMatchObject({ Id: 'batismo', Nome: 'Batismo de Adultos' });
  });

  it('oculta e reativa', async () => {
    await atualizarCategoria('crisma', { ativo: false });
    expect(categorias.valores()[2].Ativo).toBe('NAO');
    await atualizarCategoria('crisma', { ativo: true });
    expect(categorias.valores()[2].Ativo).toBe('SIM');
  });

  it('a categoria padrão não pode ser ocultada', async () => {
    await expect(atualizarCategoria('celebracoes', { ativo: false })).rejects.toThrow('A categoria padrão não pode ser ocultada.');
  });

  it('id inexistente dá erro claro', async () => {
    await expect(atualizarCategoria('nada', { nome: 'X' })).rejects.toThrow('Categoria não encontrada.');
  });
});

describe('moverCategoria', () => {
  it('troca de lugar só com vizinha do mesmo tipo', async () => {
    await moverCategoria('crisma', 'subir');
    const ordem = Object.fromEntries(categorias.valores().map((c) => [c.Id, Number(c.Ordem)]));
    expect(ordem.crisma).toBe(2);
    expect(ordem.batismo).toBe(3);
    expect(ordem.celebracoes).toBe(1);
  });

  it('no limite não faz nada', async () => {
    await moverCategoria('batismo', 'subir');
    expect(categorias.valores()[1].Ordem).toBe('2');
  });
});

describe('removerCategoria', () => {
  it('com eventos só oculta', async () => {
    const r = await removerCategoria('batismo');
    expect(r).toEqual({ resultado: 'ocultada' });
    expect(categorias.valores()[1].Ativo).toBe('NAO');
  });

  it('sem eventos marca como removida (a linha fica, é histórico)', async () => {
    const r = await removerCategoria('crisma');
    expect(r).toEqual({ resultado: 'removida' });
    expect(categorias.valores()[2].Ativo).toBe('REMOVIDA');
  });

  it('a padrão é fixa', async () => {
    await expect(removerCategoria('celebracoes')).rejects.toThrow('A categoria padrão não pode ser removida.');
  });
});

describe('slugsAtivos', () => {
  it('lista só as que aceitam eventos novos', async () => {
    categorias = criarAba([cat('celebracoes', 'C', 'celebracao', 1), cat('crisma', 'Cr', 'sacramento', 2, 'NAO')]);
    expect(await slugsAtivos()).toEqual(['celebracoes']);
  });
});
