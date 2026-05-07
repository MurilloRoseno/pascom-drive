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
        <div className="flex flex-wrap gap-2 mb-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-8 w-24 rounded-sm animate-pulse" style={{ background: 'var(--photo-bone)' }} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bloco bloco--roxo text-center py-8">
        <div className="bloco__titulo">Erro ao carregar</div>
        <p>Não foi possível carregar as fotos.</p>
        <p className="text-sm mt-1" style={{ color: 'var(--photo-grafite)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <FilterEvent
        eventos={eventos}
        eventoSelecionado={eventoSelecionado}
        onSelect={setEventoSelecionado}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {fotos.map(foto => <PhotoCard key={foto.id} foto={foto} />)}
      </div>
    </div>
  );
}
