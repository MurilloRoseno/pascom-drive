// useFotos.js — fetches photos from /api/fotos and handles event filtering.
import { useState, useEffect } from 'react';
import { listarFotos as apiFotos } from '../lib/api';

/**
 * @param {string|null} eventoSelecionado
 * @returns {{ fotos, isLoading, error, eventos }}
 */
export function useFotos(eventoSelecionado = null) {
  const [todasFotos, setTodasFotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiFotos()
      .then((data) => {
        if (!cancelled) setTodasFotos(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Erro ao carregar fotos');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const fotos = eventoSelecionado
    ? todasFotos.filter((f) => f.event === eventoSelecionado)
    : todasFotos;

  const eventos = [...new Set(todasFotos.map((f) => f.event))];

  return { fotos, isLoading, error, eventos };
}

export default useFotos;
