import { useState, useEffect } from 'react';

const MOCK_FOTOS = [
  { id: '1', event: 'Missa de Páscoa', url: 'https://picsum.photos/seed/foto1/400/600', price: 25.00 },
  { id: '2', event: 'Missa de Páscoa', url: 'https://picsum.photos/seed/foto2/400/600', price: 25.00 },
  { id: '3', event: 'Quermesse 2025',  url: 'https://picsum.photos/seed/foto3/400/600', price: 20.00 },
  { id: '4', event: 'Quermesse 2025',  url: 'https://picsum.photos/seed/foto4/400/600', price: 20.00 },
  { id: '5', event: 'Batismo Junho',   url: 'https://picsum.photos/seed/foto5/400/600', price: 30.00 },
  { id: '6', event: 'Batismo Junho',   url: 'https://picsum.photos/seed/foto6/400/600', price: 30.00 },
];

/**
 * @param {string|null} eventoFiltro
 * @returns {{ fotos, isLoading, eventos }}
 */
export function useFotos(eventoFiltro) {
  const [fotos, setFotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Phase 4: substituir por fetch('/api/fotos')
    const timer = setTimeout(() => {
      const filtered = eventoFiltro
        ? MOCK_FOTOS.filter(f => f.event === eventoFiltro)
        : MOCK_FOTOS;
      setFotos(filtered);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [eventoFiltro]);

  const eventos = [...new Set(MOCK_FOTOS.map(f => f.event))];
  return { fotos, isLoading, eventos };
}
