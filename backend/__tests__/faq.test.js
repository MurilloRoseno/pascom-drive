jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { criarAba } = require('../test-utils/fake-sheet');
const {
  TEMAS, listarFaq, criarFaq, atualizarFaq, excluirFaq, aplicarTokens,
} = require('../lib/faq');

let aba;

function linha(over = {}) {
  return {
    Id: 'f1', Tema: 'comprar', Pergunta: 'Como compro uma foto?', Resposta: 'Escolha e pague.',
    Passos: 'Passo A\nPasso B', Imagem: '', ImagemLegenda: '', Video: '', VideoTitulo: '',
    Publicada: 'SIM', Ordem: '1', AtualizadoEm: '', ...over,
  };
}

beforeEach(() => {
  aba = criarAba([linha(), linha({ Id: 'f2', Pergunta: 'Rascunho?', Resposta: '', Publicada: 'NAO', Ordem: '2' }), linha({ Id: 'f3', Publicada: 'EXCLUIDA', Ordem: '3' })]);
  obterAba.mockResolvedValue(aba);
});

describe('listarFaq', () => {
  it('traz tudo menos as excluídas, com passos em lista', async () => {
    const lista = await listarFaq();
    expect(lista.map((f) => f.id)).toEqual(['f1', 'f2']);
    expect(lista[0]).toMatchObject({ tema: 'comprar', publicada: true, passos: ['Passo A', 'Passo B'], ordem: 1 });
    expect(lista[1].publicada).toBe(false);
  });

  it('só as publicadas para o site', async () => {
    expect((await listarFaq({ apenasPublicadas: true })).map((f) => f.id)).toEqual(['f1']);
  });

  it('aba vazia recebe as perguntas iniciais; as sensíveis (privacidade) entram como rascunho', async () => {
    aba = criarAba([]);
    obterAba.mockResolvedValue(aba);
    const lista = await listarFaq();
    expect(lista.length).toBeGreaterThanOrEqual(10);
    const temas = new Set(lista.map((f) => f.tema));
    for (const t of ['comprar', 'pagar', 'receber', 'problemas']) expect(temas.has(t)).toBe(true);
    const privacidade = lista.filter((f) => f.tema === 'privacidade');
    expect(privacidade.length).toBeGreaterThan(0);
    expect(privacidade.every((f) => f.publicada === false)).toBe(true);
    expect(lista.some((f) => f.resposta.includes('{preco}'))).toBe(true);
  });
});

describe('criarFaq', () => {
  const base = { tema: 'pagar', pergunta: 'Posso pagar com cartão?', resposta: 'Sim, cartão de crédito e Pix.' };

  it('cria como rascunho com id próprio e a próxima ordem', async () => {
    const f = await criarFaq(base);
    expect(f).toMatchObject({ tema: 'pagar', pergunta: base.pergunta, publicada: false, ordem: 4 });
    expect(f.id).toMatch(/^faq_[0-9a-f]{8}$/);
    expect(aba.valores().at(-1)).toMatchObject({ Publicada: 'NAO', Ordem: '4' });
  });

  it('aceita rascunho sem resposta (vem de pergunta que o assistente não soube responder)', async () => {
    const f = await criarFaq({ tema: 'problemas', pergunta: 'Cobrança duplicada?' });
    expect(f.resposta).toBe('');
  });

  it('valida tema, tamanho, passos e links', async () => {
    await expect(criarFaq({ ...base, tema: 'inventado' })).rejects.toThrow();
    await expect(criarFaq({ ...base, pergunta: 'Oi' })).rejects.toThrow();
    await expect(criarFaq({ ...base, passos: Array(11).fill('x') })).rejects.toThrow();
    await expect(criarFaq({ ...base, video: 'javascript:alert(1)' })).rejects.toThrow();
    await expect(criarFaq({ ...base, imagem: 'http://inseguro.com/a.png' })).rejects.toThrow();
    await expect(criarFaq({ ...base, extra: 1 })).rejects.toThrow();
  });

  it('aceita imagem e vídeo https e guarda legenda e título', async () => {
    const f = await criarFaq({ ...base, imagem: 'https://exemplo.com/a.png', imagemLegenda: 'Tela de pagamento', video: 'https://youtu.be/abc', videoTitulo: 'Como pagar' });
    expect(f).toMatchObject({ imagem: 'https://exemplo.com/a.png', imagemLegenda: 'Tela de pagamento', video: 'https://youtu.be/abc', videoTitulo: 'Como pagar' });
  });

  it('neutraliza fórmula de planilha e quebra de linha dentro de um passo', async () => {
    await criarFaq({ ...base, pergunta: '=HYPERLINK("x") isso?', passos: ['linha 1\nlinha 2'] });
    const v = aba.valores().at(-1);
    expect(v.Pergunta.startsWith("'")).toBe(true);
    expect(v.Passos).toBe('linha 1 linha 2');
  });
});

describe('atualizarFaq', () => {
  it('edita campos e muda a hora de atualização', async () => {
    const f = await atualizarFaq('f1', { resposta: 'Nova resposta com mais de dez letras.' });
    expect(f.resposta).toBe('Nova resposta com mais de dez letras.');
    expect(aba.valores()[0].AtualizadoEm).not.toBe('');
  });

  it('publica e despublica', async () => {
    expect((await atualizarFaq('f2', { resposta: 'Resposta completa e clara.', publicada: true })).publicada).toBe(true);
    expect((await atualizarFaq('f2', { publicada: false })).publicada).toBe(false);
  });

  it('não publica sem resposta', async () => {
    await expect(atualizarFaq('f2', { publicada: true })).rejects.toThrow('Escreva a resposta antes de publicar.');
    expect(aba.valores()[1].Publicada).toBe('NAO');
  });

  it('não deixa apagar a resposta de uma pergunta publicada', async () => {
    await expect(atualizarFaq('f1', { resposta: '' })).rejects.toThrow('Escreva a resposta antes de publicar.');
  });

  it('id inexistente ou excluído: 404', async () => {
    await expect(atualizarFaq('nada', { tema: 'pagar' })).rejects.toMatchObject({ status: 404 });
    await expect(atualizarFaq('f3', { tema: 'pagar' })).rejects.toMatchObject({ status: 404 });
  });

  it('rejeita campo desconhecido (não dá para mexer na Ordem ou no Id por aqui)', async () => {
    await expect(atualizarFaq('f1', { id: 'outro' })).rejects.toThrow();
  });
});

describe('excluirFaq', () => {
  it('marca como excluída e a linha fica na planilha', async () => {
    await excluirFaq('f2');
    expect(aba.valores()[1].Publicada).toBe('EXCLUIDA');
    expect((await listarFaq()).map((f) => f.id)).toEqual(['f1']);
  });
});

describe('aplicarTokens e temas', () => {
  const valores = {
    precoFoto: 5, taxaServico: 2, taxaComodidade: 1, validadeHoras: 24, usosMaximos: 2,
  };

  it('troca os tokens de preço, taxas, validade e usos pelos valores atuais', () => {
    expect(aplicarTokens('{preco} + {taxaServico} + {taxaComodidade}; link de {validade} h, {usos} usos.', valores))
      .toBe('R$ 5,00 + R$ 2,00 + R$ 1,00; link de 24 h, 2 usos.');
    expect(aplicarTokens('{preco} e {preco}', { ...valores, precoFoto: 7.5 })).toBe('R$ 7,50 e R$ 7,50');
  });

  it('a FAQ inicial só usa tokens conhecidos e nunca grava valor fixo', async () => {
    const aba = criarAba();
    obterAba.mockResolvedValue(aba);
    const todas = await listarFaq();
    const texto = todas.map((f) => `${f.resposta} ${f.passos.join(' ')}`).join(' ');
    expect(aplicarTokens(texto, valores)).not.toMatch(/\{\w+\}/);
    expect(texto).not.toMatch(/R\$\s*\d/);
    expect(texto).not.toMatch(/\b7 dias\b/);
  });

  it('só a pergunta de privacidade nasce como rascunho', async () => {
    const aba = criarAba();
    obterAba.mockResolvedValue(aba);
    const todas = await listarFaq();
    expect(todas.filter((f) => !f.publicada).map((f) => f.tema)).toEqual(['privacidade']);
  });

  it('os temas cobrem os assuntos pedidos', () => {
    expect(TEMAS.map((t) => t.id)).toEqual(['comprar', 'localizar', 'pagar', 'receber', 'prazo', 'problemas', 'privacidade']);
  });
});
