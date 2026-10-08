const { applicationPreviewUrl, rows, eventoFromRow, fotoFromRow } = require('./google-sheets.shared');
const { readThrough } = require('./runtime-cache');

async function listarEventos() {
  return (await rows('Eventos')).map(eventoFromRow);
}

async function catalogoPublicado() {
  const { value } = await readThrough('catalogo-publicado:v2', async () => {
    const startedAt = Date.now();
    const [eventRows, photoRows] = await Promise.all([rows('Eventos'), rows('Fotos')]);
    console.log(JSON.stringify({
      event: 'sheets_catalog_read',
      elapsedMs: Date.now() - startedAt,
      ts: new Date().toISOString(),
    }));
    return {
      events: eventRows.map(eventoFromRow).filter((event) => event.publication === 'publicado'),
      photos: photoRows.map(fotoFromRow),
    };
  }, { ttl: 300, tags: ['catalogo-eventos'], name: 'catalogo-eventos' });
  return value;
}

async function listarEventosPublicados({ categoria = '', q = '' } = {}) {
  const term = q.trim().toLowerCase();
  const catalog = await catalogoPublicado();
  const events = catalog.events
    .filter((event) => !categoria || event.category === categoria)
    .filter((event) => !term || `${event.title} ${event.category} ${event.date}`.toLowerCase().includes(term));
  return events.map((event) => {
    const publicEvent = { ...event };
    delete publicEvent.codeHash;
    delete publicEvent.codeVersion;
    const cover = catalog.photos.find((foto) =>
      foto.eventoId === event.eventoId && foto.type === 'capa' && foto.status === 'Processada' && foto.previewFileId
    );
    if (cover) {
      publicEvent.cover = applicationPreviewUrl(event.eventoId, cover.id, 'preview');
      publicEvent.coverThumbnail = applicationPreviewUrl(event.eventoId, cover.id, 'thumbnail');
    } else if (event.visibility === 'publica') {
      const firstPhoto = catalog.photos.find((foto) =>
        foto.eventoId === event.eventoId && foto.status === 'Processada' && foto.previewFileId
      );
      if (firstPhoto) {
        // capa=1: se a previa sumir do Drive, a API devolve a foto da igreja no lugar.
        publicEvent.cover = `${applicationPreviewUrl(event.eventoId, firstPhoto.id, 'preview')}?capa=1`;
        publicEvent.coverThumbnail = `${applicationPreviewUrl(event.eventoId, firstPhoto.id, 'thumbnail')}&capa=1`;
      }
    }
    return publicEvent;
  });
}

async function buscarEvento(eventoId) {
  return (await listarEventos()).find((event) => event.eventoId === eventoId) || null;
}

async function buscarEventoPorSlug(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  return (await listarEventos()).find((event) => String(event.slug || '').toLowerCase() === normalized) || null;
}

async function listarFotosEvento(eventoId) {
  const { value: photos } = await readThrough(`fotos-evento:${eventoId}:v2`, async () => (
    (await rows('Fotos')).map(fotoFromRow)
  ), { ttl: 300, tags: [`evento-${eventoId}`, `media-${eventoId}`], name: 'fotos-evento' });
  return photos
    .filter((foto) => foto.eventoId === eventoId && foto.type !== 'capa' && foto.status === 'Processada')
    .map((foto) => {
      const preview = {
        ...foto,
        previewUrl: applicationPreviewUrl(foto.eventoId, foto.id, 'preview'),
        thumbnailUrl: foto.thumbnailFileId
          ? applicationPreviewUrl(foto.eventoId, foto.id, 'thumbnail')
          : applicationPreviewUrl(foto.eventoId, foto.id, 'preview'),
      };
      delete preview.originalFileId;
      delete preview.previewFileId;
      delete preview.thumbnailFileId;
      return preview;
    });
}

async function buscarPreviewFoto(eventoId, fotoId, variant = 'preview') {
  const { value: photos } = await readThrough(`derivados-evento:${eventoId}:v2`, async () => (
    (await rows('Fotos')).map(fotoFromRow)
  ), { ttl: 300, tags: [`evento-${eventoId}`, `media-${eventoId}`], name: 'derivados-evento' });
  const photo = photos.find((foto) => foto.eventoId === eventoId && foto.id === fotoId && foto.status === 'Processada');
  if (!photo || !photo.previewFileId) return null;
  const derivativeFileId = variant === 'thumbnail' && photo.thumbnailFileId
    ? photo.thumbnailFileId
    : photo.previewFileId;
  return { derivativeFileId, type: photo.type, variant: derivativeFileId === photo.thumbnailFileId ? 'thumbnail' : 'preview' };
}

async function buscarFotosParaCompra(fotoIds) {
  const selected = new Set(fotoIds);
  const photoRows = (await rows('Fotos')).map(fotoFromRow).filter((foto) => selected.has(foto.id));
  const events = await listarEventos();
  const eventMap = new Map(events.map((event) => [event.eventoId, event]));
  return photoRows.map((foto) => ({ foto, evento: eventMap.get(foto.eventoId) }));
}

async function listarRegrasPagamento() {
  return (await rows('RegrasPagamento'))
    .filter((row) => String(row.get('Ativo') || '').toUpperCase() === 'SIM' || row.get('Ativo') === true)
    .map((row) => ({
      method: row.get('MeioPagamento'),
      percentage: Number(row.get('PercentualEstimado') || 0),
      fixed: Number(row.get('ValorFixo') || 0),
      activeFrom: row.get('Vigencia') || '',
    }));
}

module.exports = {
  listarEventos,
  catalogoPublicado,
  listarEventosPublicados,
  buscarEvento,
  buscarEventoPorSlug,
  listarFotosEvento,
  buscarPreviewFoto,
  buscarFotosParaCompra,
  listarRegrasPagamento,
};
