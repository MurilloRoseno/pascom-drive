/**
 * Troca o middleware de permissão por um que "loga" quem vem no cabeçalho
 * `Authorization: Bearer <papel>` e aplica a checagem de permissão de verdade.
 * Uso: jest.mock('../lib/pascom-permissoes', () => require('../test-utils/login-falso').mockPermissoes());
 *
 * Token = papel ("Bearer coord" entra como coordenação). Sufixos e nomes especiais:
 *   "admin-velho"  login de 45 minutos atrás (claim fva), "admin-novo" de 3 minutos;
 *   "forasteiro"   não está na equipe (403); "ruim" sessão inválida (401).
 */
function mockPermissoes() {
  const { exigirPermissao: real } = jest.requireActual('../lib/pascom-permissoes');
  const logar = (req, res, next) => {
    const [esquema, token] = (req.headers.authorization || '').split(' ');
    if (esquema !== 'Bearer' || !token) return res.status(401).json({ error: 'Faça login para continuar' });
    if (token === 'ruim') return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    if (token === 'forasteiro') return res.status(403).json({ error: 'Usuario sem permissao na EquipePascom.' });
    let papel = token;
    let sessao = {};
    if (token.endsWith('-velho')) { papel = token.replace('-velho', ''); sessao = { fva: [45, -1] }; }
    if (token.endsWith('-novo')) { papel = token.replace('-novo', ''); sessao = { fva: [3, -1] }; }
    req.pascom = {
      userId: papel, name: papel, role: papel, email: `${papel}@pascom.org`, phone: '', sessao,
    };
    return next();
  };
  return { exigirPermissao: (permissao) => [logar, real(permissao)] };
}

module.exports = { mockPermissoes };
