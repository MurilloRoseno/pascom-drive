import { useState } from 'react';
import PhotoCard from './PhotoCard.jsx';
import FilterEvent from './FilterEvent.jsx';
import { useFotos } from '../hooks/useFotos.js';

function SkeletonCard() {
  return (
    <div className="rounded-lg overflow-hidden animate-pulse">
      <div className="w-full aspect-[2/3]" style={{ background: 'var(--photo-bone)' }} />
    </div>
  );
}

export default function Gallery() {
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const { fotos, isLoading, error, eventos } = useFotos(eventoSelecionado);

  if (isLoading) {
    return (
      <div>
        <div className="mb-4 h-7 w-48 rounded animate-pulse" style={{ background: 'var(--photo-bone)' }} />
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[1,2,3].map(i => (
            <div key={i} className="h-8 w-24 flex-shrink-0 rounded-full animate-pulse" style={{ background: 'var(--photo-bone)' }} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          background: 'var(--photo-primary-light)',
          border: '1px solid var(--photo-primary)',
        }}
      >
        <p className="font-medium mb-1" style={{ color: 'var(--photo-primary)' }}>
          Erro ao carregar fotos
        </p>
        <p className="text-sm" style={{ color: 'var(--photo-grafite)' }}>{error}</p>
      </div>
    );
  }

  const titulo = eventoSelecionado || 'Fotos do Evento';

  return (
    <div>
      <h1
        className="font-display font-bold text-xl md:text-2xl mb-4"
        style={{ color: 'var(--photo-ink)' }}
      >
        {titulo}
      </h1>

      <FilterEvent
        eventos={eventos}
        eventoSelecionado={eventoSelecionado}
        onSelect={setEventoSelecionado}
      />

      {fotos.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: 'var(--photo-sepia)' }}>
          Nenhuma foto encontrada para este evento.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map(foto => <PhotoCard key={foto.id} foto={foto} />)}
        </div>
      )}
    </div>
  );
}
