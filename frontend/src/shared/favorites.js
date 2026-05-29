import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'pascom:favorites:v1';

function readFavorites() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_error) {
    return [];
  }
}

function writeFavorites(items) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useFavoritePhotos(eventoId) {
  const [items, setItems] = useState(() => readFavorites());
  useEffect(() => { writeFavorites(items); }, [items]);
  const ids = useMemo(() => new Set(items.filter((item) => item.eventoId === eventoId).map((item) => item.fotoId)), [items, eventoId]);

  function toggleFavorite(photo) {
    const fotoId = photo.id || photo.photoId;
    setItems((current) => {
      const exists = current.some((item) => item.eventoId === eventoId && item.fotoId === fotoId);
      if (exists) return current.filter((item) => !(item.eventoId === eventoId && item.fotoId === fotoId));
      return [...current, { eventoId, fotoId, savedAt: new Date().toISOString() }];
    });
  }

  function favoritePhotos(photos) {
    return photos.filter((photo) => ids.has(photo.id || photo.photoId));
  }

  return {
    favoriteIds: ids,
    favoriteCount: ids.size,
    favoritePhotos,
    toggleFavorite,
  };
}
