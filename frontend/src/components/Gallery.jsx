import { useState } from 'react';
import PhotoCard from './PhotoCard.jsx';
import FilterEvent from './FilterEvent.jsx';
import { useFotos } from '../hooks/useFotos.js';

export default function Gallery() {
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const { fotos, isLoading, eventos } = useFotos(eventoSelecionado);

  if (isLoading) {
    return <div className="text-center py-12 text-photo-ink">Carregando fotos...</div>;
  }

  return (
    <div>
      <FilterEvent
        eventos={eventos}
        eventoSelecionado={eventoSelecionado}
        onSelect={setEventoSelecionado}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {fotos.map(foto => <PhotoCard key={foto.id} foto={foto} />)}
      </div>
    </div>
  );
}
