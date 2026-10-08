export function galleryToken(eventoId) {
  return sessionStorage.getItem(`gallery:${eventoId}`) || '';
}

export function saveGalleryToken(eventoId, token) {
  sessionStorage.setItem(`gallery:${eventoId}`, token);
}

export function normalizePhoto(photo) {
  return {
    ...photo,
    previewUrl: photo.previewUrl || photo.url,
    thumbnailUrl: photo.thumbnailUrl || photo.thumb || photo.previewUrl || photo.url,
    caption: photo.caption || 'Registro da galeria paroquial.',
  };
}

export function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}
