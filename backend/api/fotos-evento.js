const { buscarEvento, listarFotosEvento } = require('../lib/google-sheets');
const { tokenAllowsEvent } = require('../lib/gallery-access');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, noimageindex');
  try {
    const event = await buscarEvento(req.params.eventoId);
    if (!event || event.publication !== 'publicado') {
      return res.status(404).json({ error: 'Evento nao encontrado.' });
    }
    const token = req.headers['x-gallery-token'];
    if (!tokenAllowsEvent(token, event)) {
      return res.status(401).json({ protected: true, error: 'Informe o codigo para acessar esta galeria.' });
    }
    const safeEvent = { ...event };
    delete safeEvent.codeHash;
    delete safeEvent.codeVersion;
    const photos = await listarFotosEvento(event.eventoId);
    const tokenQuery = event.visibility === 'protegida' ? `?token=${encodeURIComponent(token)}` : '';
    return res.json({
      event: safeEvent,
      photos: photos.map((photo) => ({
        ...photo,
        previewUrl: `${photo.previewUrl}${tokenQuery}`,
        thumbnailUrl: `${photo.thumbnailUrl || photo.previewUrl}${tokenQuery}`,
      })),
    });
  } catch (error) {
    next(error);
  }
};
