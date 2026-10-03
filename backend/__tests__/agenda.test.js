jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { criarAba } = require('../test-utils/fake-sheet');
const {
  TIPOS, criarCompromisso, atualizarCompromisso, removerCompromisso, listarCompromissos,
  expandir, ocorrenciasDoMes, proximas,
} = require('../lib/agenda');

let aba;
beforeEach(() => {
  aba = criarAba();
  obterAba.mockResolvedValue(aba);
});

const base = { titulo: 'Missa dominical', data: '2026-10-04', tipo: 'missa' };

describe('criarCompromisso', () => {
  it('cria com hora, local e recorrência, guardando tudo como texto', async () => {
    const c = await criarCompromisso({ ...base, hora: '08:00', horaFim: '09:00', local: 'Matriz', recorrencia: 'semanal', descricao: 'Todos são bem-vindos' });
    expect(c).toMatchObject({ titulo: 'Missa dominical', data: '2026-10-04', hora: '08:00', horaFim: '09:00', local: 'Matriz', tipo: 'missa', recorrencia: 'semanal', ativo: true });
    expect(c.id).toMatch(/^ag_[0-9a-f]{8}$/);
    expect(aba.valores()[0]).toMatchObject({ Data: '2026-10-04', Hora: '08:00', Ativo: 'SIM', Recorrencia: 'semanal' });
  });

  it('padrões: sem recorrência e sem hora (dia inteiro)', async () => {
    const c = await criarCompromisso(base);
    expect(c).toMatchObject({ recorrencia: 'nenhuma', hora: '', horaFim: '', local: '', ate: '' });
  });

  it.each([
    ['sem título', { ...base, titulo: ' ' }, 'Dê um título ao compromisso.'],
    ['data impossível', { ...base, data: '2026-02-30' }, 'Escolha uma data válida.'],
    ['hora mal formada', { ...base, hora: '25:00' }, 'Horário inválido.'],
    ['término antes do início', { ...base, hora: '09:00', horaFim: '08:00' }, 'O horário de término precisa ser depois do início.'],
    ['término sem início', { ...base, horaFim: '08:00' }, 'O horário de término precisa ser depois do início.'],
    ['fim da recorrência antes da data', { ...base, recorrencia: 'semanal', ate: '2026-09-01' }, 'O fim da repetição precisa ser depois da data.'],
    ['tipo inventado', { ...base, tipo: 'show' }, 'Dados inválidos'],
    ['campo desconhecido', { ...base, ativo: false }, 'Dados inválidos'],
  ])('recusa %s', async (_n, entrada, mensagem) => {
    await expect(criarCompromisso(entrada)).rejects.toThrow(mensagem);
    expect(aba.valores()).toHaveLength(0);
  });

  it('recusa campo desconhecido e neutraliza fórmula de planilha', async () => {
    await expect(criarCompromisso({ ...base, ativo: false })).rejects.toThrow();
    await criarCompromisso({ ...base, titulo: '=HYPERLINK("x") missa', local: '+cmd' });
    expect(aba.valores()[0].Titulo.startsWith("'")).toBe(true);
    expect(aba.valores()[0].Local.startsWith("'")).toBe(true);
  });

  it('ignora "ate" quando não há repetição', async () => {
    const c = await criarCompromisso({ ...base, ate: '2026-12-31' });
    expect(c.ate).toBe('');
  });
});

describe('atualizar e remover', () => {
  it('atualiza só o que veio e valida o conjunto final', async () => {
    const c = await criarCompromisso({ ...base, hora: '08:00' });
    const r = await atualizarCompromisso(c.id, { local: 'Salão' });
    expect(r).toMatchObject({ local: 'Salão', hora: '08:00', titulo: 'Missa dominical' });
    await expect(atualizarCompromisso(c.id, { horaFim: '07:00' })).rejects.toThrow('O horário de término precisa ser depois do início.');
    expect(aba.valores()[0].HoraFim).toBe('');
  });

  it('id inexistente ou removido: 404', async () => {
    await expect(atualizarCompromisso('nada', { local: 'x' })).rejects.toMatchObject({ status: 404 });
    const c = await criarCompromisso(base);
    await removerCompromisso(c.id);
    await expect(atualizarCompromisso(c.id, { local: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('remover só inativa: a linha continua na planilha como histórico', async () => {
    const c = await criarCompromisso(base);
    await removerCompromisso(c.id);
    expect(aba.valores()[0].Ativo).toBe('NAO');
    expect(await listarCompromissos()).toHaveLength(0);
    expect(await listarCompromissos({ incluirInativos: true })).toHaveLength(1);
  });
});

describe('expandir — recorrência', () => {
  const item = (o) => ({ id: 'x', titulo: 'T', data: '2026-10-04', hora: '', horaFim: '', local: '', tipo: 'missa', recorrencia: 'nenhuma', ate: '', descricao: '', ativo: true, ...o });

  it('sem recorrência aparece só no dia, e só se estiver na faixa', () => {
    const lista = [item({ data: '2026-10-04' })];
    expect(expandir(lista, '2026-10-01', '2026-10-31').map((o) => o.data)).toEqual(['2026-10-04']);
    expect(expandir(lista, '2026-11-01', '2026-11-30')).toEqual([]);
  });

  it('semanal repete no mesmo dia da semana, a partir da data inicial', () => {
    const datas = expandir([item({ recorrencia: 'semanal' })], '2026-09-01', '2026-10-31').map((o) => o.data);
    expect(datas).toEqual(['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25']);
  });

  it('semanal respeita a data final da repetição', () => {
    const datas = expandir([item({ recorrencia: 'semanal', ate: '2026-10-15' })], '2026-10-01', '2026-10-31').map((o) => o.data);
    expect(datas).toEqual(['2026-10-04', '2026-10-11']);
  });

  it('mensal repete no mesmo dia do mês; dia 31 cai no último dia dos meses menores', () => {
    const datas = expandir([item({ data: '2026-01-31', recorrencia: 'mensal' })], '2026-01-01', '2026-04-30').map((o) => o.data);
    expect(datas).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('mensal não aparece antes da data inicial', () => {
    expect(expandir([item({ data: '2026-10-15', recorrencia: 'mensal' })], '2026-08-01', '2026-09-30')).toEqual([]);
  });

  it('ordena por dia, dia inteiro primeiro e depois por hora', () => {
    const lista = [
      item({ id: 'a', data: '2026-10-04', hora: '19:00', titulo: 'Noite' }),
      item({ id: 'b', data: '2026-10-04', hora: '', titulo: 'Dia todo' }),
      item({ id: 'c', data: '2026-10-04', hora: '08:00', titulo: 'Manhã' }),
      item({ id: 'd', data: '2026-10-03', hora: '10:00', titulo: 'Antes' }),
    ];
    expect(expandir(lista, '2026-10-01', '2026-10-31').map((o) => o.titulo)).toEqual(['Antes', 'Dia todo', 'Manhã', 'Noite']);
  });

  it('não expõe campos internos nas ocorrências', () => {
    const [o] = expandir([item()], '2026-10-01', '2026-10-31');
    expect(o).not.toHaveProperty('ativo');
    expect(o).not.toHaveProperty('ate');
    expect(Object.keys(o).sort()).toEqual(['data', 'descricao', 'hora', 'horaFim', 'id', 'local', 'recorrencia', 'tipo', 'titulo']);
  });
});

describe('ocorrenciasDoMes e proximas', () => {
  it('cobre as 6 semanas da grade (inclui dias dos meses vizinhos)', async () => {
    await criarCompromisso({ ...base, data: '2026-09-28', titulo: 'Fim de setembro' });
    await criarCompromisso({ ...base, data: '2026-11-03', titulo: 'Começo de novembro' });
    await criarCompromisso({ ...base, data: '2026-12-25', titulo: 'Natal' });
    const titulos = (await ocorrenciasDoMes('2026-10')).map((o) => o.titulo);
    expect(titulos).toEqual(['Fim de setembro', 'Começo de novembro']);
  });

  it('não lista compromissos removidos', async () => {
    const c = await criarCompromisso(base);
    await removerCompromisso(c.id);
    expect(await ocorrenciasDoMes('2026-10')).toEqual([]);
  });

  it('próximas: só o que ainda vai acontecer, no máximo N, a partir de hoje', async () => {
    await criarCompromisso({ ...base, data: '2026-09-27', titulo: 'Já passou' });
    await criarCompromisso({ ...base, data: '2026-10-04', titulo: 'Domingo', recorrencia: 'semanal' });
    const lista = await proximas(3, '2026-10-03');
    expect(lista.map((o) => o.data)).toEqual(['2026-10-04', '2026-10-11', '2026-10-18']);
    expect(lista.map((o) => o.titulo)).not.toContain('Já passou');
  });

  it('os tipos disponíveis', () => {
    expect(TIPOS.map((t) => t.id)).toEqual(['missa', 'sacramento', 'reuniao', 'formacao', 'festa']);
  });
});
