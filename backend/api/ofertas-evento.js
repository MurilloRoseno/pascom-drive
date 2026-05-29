const { buscarEvento } = require('../lib/google-sheets');
const { listarOfertasEvento } = require('../lib/commercial-rules');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const event = await buscarEvento(req.params.eventoId);
    if (!event || event.publication !== 'publicado') return res.status(404).json({ error: 'Evento nao encontrado.' });
    const offers = await listarOfertasEvento(event.eventoId);
    return res.json({ eventId: event.eventoId, offers });
  } catch (error) {
    next(error);
  }
};
