import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function CartSummary() {
  const { fotos, totais } = useCarrinho();
  const navigate = useNavigate();

  if (fotos.length === 0) return null;

  const plural = fotos.length > 1;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl"
      style={{
        background: '#fff',
        borderTop: '2px solid var(--photo-accent)',
      }}
    >
      <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-sm font-medium leading-tight"
            style={{ color: 'var(--photo-grafite)' }}
          >
            {fotos.length} foto{plural ? 's' : ''} selecionada{plural ? 's' : ''}
          </p>
          <p
            className="font-mono font-bold text-lg leading-tight"
            style={{ color: 'var(--photo-primary)' }}
          >
            {fmt(totais.total)}
          </p>
        </div>

        <button
          onClick={() => navigate('/checkout')}
          className="btn btn-primary btn-lg flex-shrink-0"
        >
          Finalizar →
        </button>
      </div>
    </div>
  );
}
