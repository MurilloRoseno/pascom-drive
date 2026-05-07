import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function CartSummary() {
  const { fotos, totais } = useCarrinho();
  const navigate = useNavigate();

  if (fotos.length === 0) return null;

  const { subtotal, taxa, total } = totais;

  return (
    <div className="card sticky bottom-4" style={{ borderColor: 'var(--photo-primary-light)' }}>
      <div className="eyebrow mb-3">
        {fotos.length} foto{fotos.length > 1 ? 's' : ''} selecionada{fotos.length > 1 ? 's' : ''}
      </div>

      <div className="space-y-1 text-sm" style={{ color: 'var(--photo-ink)' }}>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-mono">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--photo-grafite)' }}>
          <span>Taxa Pix (2,99% + R$0,30)</span>
          <span className="font-mono">{fmt(taxa)}</span>
        </div>
        <div
          className="flex justify-between font-bold text-base border-t pt-2 mt-2"
          style={{ borderColor: 'rgba(109,32,119,0.10)' }}
        >
          <span>Total</span>
          <span className="font-display text-lg" style={{ color: 'var(--photo-primary)' }}>{fmt(total)}</span>
        </div>
      </div>

      <button
        onClick={() => navigate('/checkout')}
        className="btn btn-primary w-full mt-4"
      >
        Proceder para Pagamento →
      </button>
    </div>
  );
}
