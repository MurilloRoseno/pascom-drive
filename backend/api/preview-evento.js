const { buscarEvento, buscarPreviewFoto } = require('../lib/google-sheets');
const { tokenAllowsEvent } = require('../lib/gallery-access');
const { downloadFile } = require('../lib/google-drive');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const event = await buscarEvento(req.params.eventoId);
    if (!event || event.publication !== 'publicado') {
      return res.status(404).json({ error: 'Evento nao encontrado.' });
    }
    if (!tokenAllowsEvent(String(req.query.token || ''), event)) {
      return res.status(401).json({ error: 'Acesso a previa nao autorizado.' });
    }
    const photo = await buscarPreviewFoto(event.eventoId, req.params.fotoId);
    if (!photo) return res.status(404).json({ error: 'Previa nao encontrada.' });

    const { buffer, mimeType } = await downloadFile(photo.previewFileId);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', mimeType || 'image/jpeg');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Robots-Tag', 'noindex, noimageindex');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.end(buffer);
  } catch (error) {
    next(error);
  }
};
