const { buscarEvento, listarFotosEvento } = require('../lib/google-sheets');
const { tokenAllowsEvent } = require('../lib/gallery-access');
const { appendMediaToken, issueMediaToken } = require('../lib/media-token');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('X-Robots-Tag', 'noindex, noimageindex');
  try {
    const event = await buscarEvento(req.params.eventoId);
    if (!event || event.publication !== 'publicado') {
      return res.status(404).json({ error: 'Evento nao encontrado.' });
    }
    const token = req.headers['x-gallery-token'];
    if (!tokenAllowsEvent(token, event)) {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(401).json({ protected: true, error: 'Informe o codigo para acessar esta galeria.' });
    }
    const safeEvent = { ...event };
    delete safeEvent.codeHash;
    delete safeEvent.codeVersion;
    const photos = await listarFotosEvento(event.eventoId);
    if (event.visibility === 'publica') {
      res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
      res.setHeader('Vercel-Cache-Tag', `evento-${event.eventoId},media-${event.eventoId}`);
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
    }
    return res.json({
      event: safeEvent,
      photos: photos.map((photo) => {
        const previewToken = issueMediaToken({ eventoId: event.eventoId, fotoId: photo.id, variant: 'preview' });
        const thumbnailToken = issueMediaToken({ eventoId: event.eventoId, fotoId: photo.id, variant: 'thumbnail' });
        return {
          ...photo,
          previewUrl: appendMediaToken(photo.previewUrl, previewToken),
          thumbnailUrl: appendMediaToken(photo.thumbnailUrl || photo.previewUrl, thumbnailToken),
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};
