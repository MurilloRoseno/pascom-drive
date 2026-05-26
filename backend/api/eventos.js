const { listarEventosPublicados } = require('../lib/google-sheets');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (req.params.eventoId) {
      const safeEvent = (await listarEventosPublicados()).find((event) => event.eventoId === req.params.eventoId);
      if (!safeEvent) return res.status(404).json({ error: 'Evento nao encontrado.' });
      res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
      res.setHeader('Vercel-Cache-Tag', `catalogo-eventos,evento-${safeEvent.eventoId}`);
      return res.json({ event: safeEvent });
    }
    const eventos = await listarEventosPublicados({
      categoria: String(req.query.categoria || ''),
      q: String(req.query.q || ''),
    });
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    res.setHeader('Vercel-Cache-Tag', 'catalogo-eventos');
    return res.status(200).json({ eventos });
  } catch (err) {
    next(err);
  }
};
