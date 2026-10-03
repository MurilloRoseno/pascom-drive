const { lerSitePublico } = require('../lib/site');

/** GET /api/site: identidade, contato, redes, página inicial, módulos no ar e preço (só o que é público). */
module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(await lerSitePublico());
  } catch (err) {
    return next(err);
  }
};
