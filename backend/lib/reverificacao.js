// Reautenticação para mudar preço, taxas e repasse. O Clerk registra no token da
// sessão a idade da última verificação (claim `fva`, em minutos: [primeiro fator,
// segundo fator], -1 = nunca verificado). Se a verificação do primeiro fator for
// mais velha que a janela, a API responde com a "dica" abaixo e o navegador abre
// o desafio do Clerk (useReverification) e repete a chamada.

const JANELA_MINUTOS = 10;

const DICA_REVERIFICACAO = {
  clerk_error: { type: 'forbidden', reason: 'reverification-error', metadata: { reverification: 'strict' } },
};

/**
 * @param {{fva?: unknown}|undefined} sessao conteúdo do token verificado
 * @returns {boolean} true se é preciso pedir nova verificação
 */
function precisaReverificar(sessao) {
  const fva = sessao && sessao.fva;
  // Instância do Clerk sem a claim: não dá para medir, então não bloqueia a operação
  // (o papel de admin continua exigido). Com a claim, vale a regra.
  if (!Array.isArray(fva) || fva.length === 0 || typeof fva[0] !== 'number') return false;
  return fva[0] < 0 || fva[0] > JANELA_MINUTOS;
}

module.exports = { precisaReverificar, DICA_REVERIFICACAO, JANELA_MINUTOS };
