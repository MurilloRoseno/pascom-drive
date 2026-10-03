jest.mock('../lib/google-sheets', () => ({ obterAba: jest.fn() }));

const { obterAba } = require('../lib/google-sheets');
const { criarAba } = require('../test-utils/fake-sheet');
const { registrarSemResposta, listarSemResposta, resolverSemResposta, mascarar } = require('../lib/sem-resposta');

let aba;
beforeEach(() => {
  aba = criarAba();
  obterAba.mockResolvedValue(aba);
});

describe('mascarar', () => {
  it('esconde sequências longas de dígitos (telefone, CPF, cartão) e limita o tamanho', () => {
    expect(mascarar('meu telefone é 99988887777 ok')).toBe('meu telefone é *** ok');
    expect(mascarar('cpf 123.456.789-09')).toBe('cpf ***.***.***-**');
    expect(mascarar('x'.repeat(500)).length).toBe(200);
  });

  it('mantém números curtos (quantidade de fotos, horário)', () => {
    expect(mascarar('comprei 3 fotos às 10')).toBe('comprei 3 fotos às 10');
  });
});

describe('registrarSemResposta', () => {
  it('grava a pergunta como Aberta, sem dado pessoal e sem fórmula de planilha', async () => {
    await registrarSemResposta('Como pago com o número 99988887777?');
    expect(aba.valores()[0]).toMatchObject({ Pergunta: 'Como pago com o número ***?', Situacao: 'Aberta' });
    await registrarSemResposta('=HYPERLINK("x")');
    expect(aba.valores()[1].Pergunta.startsWith("'")).toBe(true);
  });

  it('não repete a mesma pergunta já aberta (ignora acento e caixa)', async () => {
    await registrarSemResposta('Aceitam débito?');
    await registrarSemResposta('aceitam DEBITO');
    expect(aba.valores()).toHaveLength(1);
  });

  it('não derruba o assistente se a planilha falhar', async () => {
    obterAba.mockRejectedValue(new Error('Sheets fora do ar'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(registrarSemResposta('qualquer coisa')).resolves.toBe(false);
  });
});

describe('listar e resolver', () => {
  it('lista só as abertas, mais novas primeiro, no máximo o limite', async () => {
    await registrarSemResposta('primeira pergunta');
    await registrarSemResposta('segunda pergunta');
    await registrarSemResposta('terceira pergunta');
    await resolverSemResposta('segunda pergunta');
    expect(await listarSemResposta(10)).toEqual(['terceira pergunta', 'primeira pergunta']);
    expect(await listarSemResposta(1)).toEqual(['terceira pergunta']);
  });

  it('resolver marca como Resolvida e a linha fica', async () => {
    await registrarSemResposta('Aceitam débito?');
    await resolverSemResposta('Aceitam débito?');
    expect(aba.valores()[0].Situacao).toBe('Resolvida');
  });
});
