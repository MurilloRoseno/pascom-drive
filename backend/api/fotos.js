const { listarFotos } = require('../lib/google-sheets');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const fotos = await listarFotos();
    res.json(fotos);
  } catch (err) {
    next(err);
  }
};
