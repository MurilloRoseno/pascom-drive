jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { criarAba } = require('../test-utils/fake-sheet');
const {
  listarEquipe, adicionarMembro, atualizarMembro, papelValido,
} = require('../lib/equipe');

let aba;
const ENV = process.env.PAINEL_ADMIN_EMAIL;

const membro = (identificador, role, ativo = 'SIM', nome = 'Fulano', tipo = 'email') => ({
  Identificador: identificador, Tipo: tipo, Nome: nome, Role: role, Ativo: ativo,
});

beforeEach(() => {
  delete process.env.PAINEL_ADMIN_EMAIL;
  aba = criarAba([membro('ana@p.org', 'admin', 'SIM', 'Ana'), membro('bia@p.org', 'foto', 'SIM', 'Bia')]);
  obterAba.mockResolvedValue(aba);
});
afterAll(() => {
  if (ENV === undefined) delete process.env.PAINEL_ADMIN_EMAIL; else process.env.PAINEL_ADMIN_EMAIL = ENV;
});

describe('papelValido', () => {
  it('aceita os papéis do painel, ignorando caixa e espaços; o resto não vale nada', () => {
    expect(papelValido(' Coord ')).toBe('coord');
    expect(papelValido('root')).toBe('');
    expect(papelValido('')).toBe('');
    expect(papelValido(undefined)).toBe('');
  });
});

describe('listarEquipe (esquema real: Identificador/Tipo)', () => {
  it('lista a equipe com papel e situação', async () => {
    expect(await listarEquipe()).toEqual([
      { email: 'ana@p.org', tipo: 'email', nome: 'Ana', role: 'admin', papelNaPlanilha: 'admin', ativo: true, fixo: false },
      { email: 'bia@p.org', tipo: 'email', nome: 'Bia', role: 'foto', papelNaPlanilha: 'foto', ativo: true, fixo: false },
    ]);
  });

  it('linha de telefone aparece com o tipo phone; papel desconhecido vira sem papel, mas mostra o que está na planilha', async () => {
    aba = criarAba([membro('(11) 98888-7777', 'Gerente', 'SIM', 'Zé', 'phone')]);
    obterAba.mockResolvedValue(aba);
    expect(await listarEquipe()).toEqual([
      { email: '(11) 98888-7777', tipo: 'phone', nome: 'Zé', role: '', papelNaPlanilha: 'gerente', ativo: true, fixo: false },
    ]);
  });

  it('o admin do ambiente (PAINEL_ADMIN_EMAIL) aparece como fixo, mesmo fora da planilha', async () => {
    process.env.PAINEL_ADMIN_EMAIL = 'dono@p.org';
    const lista = await listarEquipe();
    expect(lista[0]).toMatchObject({ email: 'dono@p.org', nome: 'Administrador', role: 'admin', ativo: true, fixo: true });
  });
});

describe('adicionarMembro', () => {
  it('adiciona ativo, com e-mail em minúsculas e as colunas da planilha real', async () => {
    const m = await adicionarMembro({ email: ' Carla@P.org ', nome: 'Carla', role: 'atend' });
    expect(m).toMatchObject({ email: 'carla@p.org', tipo: 'email', nome: 'Carla', role: 'atend', ativo: true, fixo: false });
    expect(aba.valores().at(-1)).toMatchObject({ Identificador: 'carla@p.org', Tipo: 'email', Role: 'atend', Ativo: 'SIM' });
    expect(aba.valores().at(-1).CriadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it.each([
    ['e-mail inválido', { email: 'sem-arroba', nome: 'X Y', role: 'foto' }, 'Informe um e-mail válido.'],
    ['nome curto', { email: 'x@p.org', nome: 'X', role: 'foto' }, 'Informe o nome.'],
    ['papel inexistente', { email: 'x@p.org', nome: 'Xis', role: 'root' }, 'Papel desconhecido.'],
    ['e-mail repetido', { email: 'BIA@p.org', nome: 'Bia 2', role: 'foto' }, 'Este e-mail já está na equipe.'],
  ])('recusa %s', async (_n, dados, msg) => {
    await expect(adicionarMembro(dados)).rejects.toThrow(msg);
  });

  it('recusa o e-mail do admin do ambiente', async () => {
    process.env.PAINEL_ADMIN_EMAIL = 'dono@p.org';
    await expect(adicionarMembro({ email: 'dono@p.org', nome: 'Dono', role: 'foto' })).rejects.toThrow('já está na equipe');
  });

  it('neutraliza fórmula de planilha no nome', async () => {
    await adicionarMembro({ email: 'f@p.org', nome: '=HYPERLINK("x")', role: 'foto' });
    expect(aba.valores().at(-1).Nome.startsWith("'")).toBe(true);
  });
});

describe('atualizarMembro', () => {
  it('muda o papel, o nome e a situação', async () => {
    await adicionarMembro({ email: 'c@p.org', nome: 'Carla', role: 'foto' });
    expect((await atualizarMembro('c@p.org', { role: 'atend', nome: 'Carla Souza' })).role).toBe('atend');
    expect((await atualizarMembro('c@p.org', { ativo: false })).ativo).toBe(false);
    expect(aba.valores().at(-1)).toMatchObject({ Role: 'atend', Nome: 'Carla Souza', Ativo: 'NAO' });
  });

  it('acha pessoa de telefone pelos dígitos', async () => {
    aba = criarAba([membro('(11) 98888-7777', 'foto', 'SIM', 'Zé', 'phone'), membro('ana@p.org', 'admin', 'SIM', 'Ana')]);
    obterAba.mockResolvedValue(aba);
    expect((await atualizarMembro('11988887777', { ativo: false })).ativo).toBe(false);
  });

  it('não deixa o painel sem administrador: nem rebaixar nem desativar o último', async () => {
    await expect(atualizarMembro('ana@p.org', { role: 'coord' })).rejects.toThrow('Precisa existir ao menos um administrador ativo.');
    await expect(atualizarMembro('ana@p.org', { ativo: false })).rejects.toThrow('Precisa existir ao menos um administrador ativo.');
    expect(aba.valores()[0]).toMatchObject({ Role: 'admin', Ativo: 'SIM' });
  });

  it('com outro admin ativo, dá para rebaixar um deles', async () => {
    await atualizarMembro('bia@p.org', { role: 'admin' });
    expect((await atualizarMembro('ana@p.org', { role: 'coord' })).role).toBe('coord');
  });

  it('o admin do ambiente conta como administrador ativo e não é editável', async () => {
    process.env.PAINEL_ADMIN_EMAIL = 'dono@p.org';
    expect((await atualizarMembro('ana@p.org', { role: 'coord' })).role).toBe('coord');
    await expect(atualizarMembro('dono@p.org', { role: 'foto' })).rejects.toThrow('definido no ambiente');
  });

  it('pessoa desconhecida: 404; campo estranho: recusado', async () => {
    await expect(atualizarMembro('nada@p.org', { role: 'foto' })).rejects.toMatchObject({ status: 404 });
    await expect(atualizarMembro('bia@p.org', { email: 'outro@p.org' })).rejects.toThrow('Dados inválidos');
  });
});
