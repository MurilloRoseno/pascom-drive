import { useState } from 'react';
import PhotoCard from './PhotoCard.jsx';
import FilterEvent from './FilterEvent.jsx';
import { useFotos } from '../hooks/useFotos.js';

export default function Gallery() {
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const { fotos, isLoading, error, eventos } = useFotos(eventoSelecionado);

  if (isLoading) {
    return <div className="text-center py-12 text-photo-ink">Carregando fotos...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <p>Não foi possível carregar as fotos.</p>
        <p className="text-sm mt-1">{error}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {fotos.map(foto => <PhotoCard key={foto.id} foto={foto} />)}
      </div>
    </div>
  );
}
