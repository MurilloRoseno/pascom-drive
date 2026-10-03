const { lerModulos } = require('../lib/modulos');

/**
 * Barra a rota quando o módulo está fora do ar (ou cai junto com o módulo de que
 * depende). A regra é do servidor: esconder o botão no navegador não basta.
 * @param {string} chave
 */
function exigirModulo(chave) {
  return async (_req, res, next) => {
    const m = (await lerModulos())[chave];
    if (m && !m.efetivo) return res.status(503).json({ error: m.recado, modulo: chave });
    return next();
  };
}

module.exports = { exigirModulo };
