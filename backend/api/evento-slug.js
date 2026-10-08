const { buscarEventoPorSlug } = require('../lib/google-sheets');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const event = await buscarEventoPorSlug(req.params.slug);
    if (!event || event.publication !== 'publicado') return res.status(404).json({ error: 'Evento nao encontrado.' });
    const safeEvent = { ...event };
    delete safeEvent.codeHash;
    delete safeEvent.codeVersion;
    return res.json({ event: safeEvent });
  } catch (error) {
    next(error);
  }
};
