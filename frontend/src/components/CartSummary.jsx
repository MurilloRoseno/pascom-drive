import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function CartSummary() {
  const { fotos, totais } = useCarrinho();
  const navigate = useNavigate();

  if (fotos.length === 0) return null;

  const plural = fotos.length !== 1;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl"
      style={{
        background: 'white',
        borderTop: '3px solid var(--photo-primary)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="region"
      aria-label="Resumo do carrinho"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">

        {/* Contagem + Total */}
        <div className="min-w-0">
          <p className="font-bold leading-tight"
             style={{ color: 'var(--photo-primary)', fontSize: 'var(--text-lg)' }}>
            {fotos.length} foto{plural ? 's' : ''} selecionada{plural ? 's' : ''}
          </p>
          <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-sm)' }}>
            Total:{' '}
            <strong style={{ color: 'var(--photo-ink)' }}>
              {fmt(totais.total)}
            </strong>
          </p>
        </div>

        {/* Botão Finalizar */}
        <button
          onClick={() => navigate('/checkout')}
          className="btn btn-primary flex-shrink-0"
          style={{ minWidth: '150px', fontSize: 'var(--text-base)' }}
          aria-label={`Finalizar compra de ${fotos.length} foto${plural ? 's' : ''}`}
        >
          Finalizar compra
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

      </div>
    </div>
  );
}
