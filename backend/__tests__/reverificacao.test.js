const { precisaReverificar, DICA_REVERIFICACAO, JANELA_MINUTOS } = require('../lib/reverificacao');

describe('precisaReverificar', () => {
  it('login recente (primeiro fator há poucos minutos): não precisa', () => {
    expect(precisaReverificar({ fva: [2, -1] })).toBe(false);
    expect(precisaReverificar({ fva: [JANELA_MINUTOS, -1] })).toBe(false);
  });

  it('login antigo: precisa verificar de novo', () => {
    expect(precisaReverificar({ fva: [JANELA_MINUTOS + 1, -1] })).toBe(true);
    expect(precisaReverificar({ fva: [600, -1] })).toBe(true);
  });

  it('primeiro fator nunca verificado nesta sessão (-1): precisa', () => {
    expect(precisaReverificar({ fva: [-1, -1] })).toBe(true);
  });

  it('claim ausente ou malformada (instância sem fva): não trava o admin, mas não é tratado como "fresco" por engano', () => {
    expect(precisaReverificar({})).toBe(false);
    expect(precisaReverificar(undefined)).toBe(false);
    expect(precisaReverificar({ fva: 'x' })).toBe(false);
    expect(precisaReverificar({ fva: [] })).toBe(false);
  });

  it('a dica segue o formato que o Clerk reconhece no navegador', () => {
    expect(DICA_REVERIFICACAO).toEqual({
      clerk_error: { type: 'forbidden', reason: 'reverification-error', metadata: { reverification: 'strict' } },
    });
  });
});
