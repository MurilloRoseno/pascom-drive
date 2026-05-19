const { listarEventos } = require('../lib/google-sheets');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const eventos = await listarEventos();
    return res.status(200).json({ eventos });
  } catch (err) {
    next(err);
  }
};
