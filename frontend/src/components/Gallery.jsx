import { useState } from 'react';
import PhotoCard from './PhotoCard.jsx';
import FilterEvent from './FilterEvent.jsx';
import { useFotos } from '../hooks/useFotos.js';

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse" style={{ background: 'var(--photo-bone)' }}>
      <div className="w-full aspect-[2/3]" />
    </div>
  );
}

export default function Gallery() {
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const { fotos, isLoading, error, eventos } = useFotos(eventoSelecionado);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div>
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 animate-pulse rounded-full"
                 style={{ height: 44, width: 96, background: 'var(--photo-bone)' }} />
          ))}
        </div>
        <div className="grid gap-4"
             style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))' }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  /* ── Erro ── */
  if (error) {
    return (
      <div className="text-center py-20 px-6">
        <p className="text-5xl mb-4">📵</p>
        <p className="font-bold mb-2"
           style={{ fontSize: 'var(--text-xl)', color: 'var(--photo-primary)' }}>
          Erro ao carregar as fotos
        </p>
        <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
          {error}
        </p>
        <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>
          Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-roxo mt-6"
          style={{ minWidth: '200px' }}
        >
          Recarregar a página
        </button>
      </div>
    );
  }

  const titulo = eventoSelecionado || 'Fotos do Evento';

  return (
    <div>
      {/* Título */}
      <h1
        className="font-display font-bold mb-4"
        style={{ color: 'var(--photo-ink)', fontSize: 'var(--text-2xl)', lineHeight: 'var(--leading-heading)' }}
      >
        {titulo}
      </h1>

      {/* Filtro de eventos */}
      <FilterEvent
        eventos={eventos}
        eventoSelecionado={eventoSelecionado}
        onSelect={setEventoSelecionado}
      />

      {/* Grid ou vazio */}
      {fotos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📷</p>
          <p style={{ color: 'var(--photo-sepia)', fontSize: 'var(--text-lg)' }}>
            Nenhuma foto encontrada para este evento.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))' }}
        >
          {fotos.map(foto => <PhotoCard key={foto.id} foto={foto} />)}
        </div>
      )}
    </div>
  );
}
