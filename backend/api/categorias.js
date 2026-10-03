const { listarCategorias } = require('../lib/categorias');

/** GET /api/categorias — categorias ativas para os filtros do site (sem contagens internas). */
module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const categorias = await listarCategorias();
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(categorias.map(({ id, nome, tipo }) => ({ id, nome, tipo })));
  } catch (err) {
    return next(err);
  }
};
