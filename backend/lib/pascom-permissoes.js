const { temPermissao } = require('./permissions');
const { garantirMatriz } = require('./acessos');

/**
 * Vem depois de `authenticatePascom` (que já confirmou a sessão e o lugar da pessoa na
 * EquipePascom). Confere a permissão `area.acao` do papel dela, com a matriz salva no
 * painel; se a planilha estiver fora do ar, nega em vez de cair no padrão.
 * Também deixa `req.membro` e `req.sessao` no formato que as rotas do painel usam.
 * @param {string} [permissao] formato `area.acao`; sem ela só exige estar na equipe
 * @returns {import('express').RequestHandler}
 */
function exigirPermissao(permissao) {
  return async (req, res, next) => {
    const pascom = req.pascom;
    if (!pascom) return res.status(401).json({ error: 'Sessão Pascom ausente.' });
    try {
      await garantirMatriz(); // matriz de acessos salva no painel (cache de 30 s)
    } catch (err) {
      console.error('[pascom] matriz de acessos indisponível', err.message);
      return res.status(503).json({ error: 'Não foi possível conferir as permissões agora. Tente de novo.' });
    }
    if (permissao && !temPermissao(pascom.role, permissao)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    req.membro = { email: pascom.email || pascom.phone || pascom.userId, nome: pascom.name, role: pascom.role };
    req.sessao = pascom.sessao || {};
    return next();
  };
}

module.exports = { exigirPermissao };
