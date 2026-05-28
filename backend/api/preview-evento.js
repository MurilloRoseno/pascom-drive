const { buscarEvento, buscarPreviewFoto } = require('../lib/google-sheets');
const { tokenAllowsEvent } = require('../lib/gallery-access');
const { mediaTokenAllows } = require('../lib/media-token');
const { downloadFile } = require('../lib/google-drive');
const { readThrough } = require('../lib/runtime-cache');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const variant = req.query.variant === 'thumbnail' ? 'thumbnail' : 'preview';
    const event = await buscarEvento(req.params.eventoId);
    if (!event || event.publication !== 'publicado') {
      return res.status(404).json({ error: 'Evento nao encontrado.' });
    }
    const photo = await buscarPreviewFoto(event.eventoId, req.params.fotoId, variant);
    if (!photo) return res.status(404).json({ error: 'Previa nao encontrada.' });
    const mediaAllowed = mediaTokenAllows(String(req.query.mt || ''), {
      eventoId: event.eventoId,
      fotoId: req.params.fotoId,
      variant,
    });
    const legacyGalleryAllowed = tokenAllowsEvent(String(req.query.token || ''), event);
    if (photo.type !== 'capa' && !mediaAllowed && !legacyGalleryAllowed) {
      return res.status(401).json({ error: 'Acesso a previa nao autorizado.' });
    }

    const { value: image } = await readThrough(
      `media:${event.eventoId}:${req.params.fotoId}:${photo.variant}:${photo.derivativeFileId}`,
      async () => {
        const startedAt = Date.now();
        const { buffer, mimeType } = await downloadFile(photo.derivativeFileId);
        console.log(JSON.stringify({
          event: 'drive_preview_download',
          eventoId: event.eventoId,
          fotoId: req.params.fotoId,
          variant: photo.variant,
          bytes: buffer.length,
          elapsedMs: Date.now() - startedAt,
          ts: new Date().toISOString(),
        }));
        return { base64: buffer.toString('base64'), mimeType: mimeType || 'image/jpeg' };
      },
      {
        ttl: 86400,
        tags: [`evento-${event.eventoId}`, `media-${event.eventoId}`],
        name: `media-${photo.variant}`,
      },
    );
    const buffer = Buffer.from(image.base64, 'base64');
    if (photo.type === 'capa') {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('Vercel-Cache-Tag', `evento-${event.eventoId},media-${event.eventoId}`);
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
    }
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Robots-Tag', 'noindex, noimageindex');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.end(buffer);
  } catch (error) {
    next(error);
  }
};
