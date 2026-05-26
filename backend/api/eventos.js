const { listarEventosPublicados, buscarEvento, listarFotosEvento, buscarCapaEvento } = require('../lib/google-sheets');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (req.params.eventoId) {
      const event = await buscarEvento(req.params.eventoId);
      if (!event || event.publication !== 'publicado') return res.status(404).json({ error: 'Evento nao encontrado.' });
      const safeEvent = { ...event };
      delete safeEvent.codeHash;
      delete safeEvent.codeVersion;
      const cover = await buscarCapaEvento(safeEvent.eventoId);
      if (cover) {
        safeEvent.cover = cover;
      } else if (safeEvent.visibility === 'publica') {
        const photos = await listarFotosEvento(safeEvent.eventoId);
        if (photos.length) safeEvent.cover = photos[0].previewUrl;
      }
      return res.json({ event: safeEvent });
    }
    const eventos = await listarEventosPublicados({
      categoria: String(req.query.categoria || ''),
      q: String(req.query.q || ''),
    });
    return res.status(200).json({ eventos });
  } catch (err) {
    next(err);
  }
};
