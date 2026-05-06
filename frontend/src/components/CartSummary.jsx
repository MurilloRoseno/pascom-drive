import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function CartSummary() {
  const { fotos, totais } = useCarrinho();
  const navigate = useNavigate();

  if (fotos.length === 0) return null;

  const { subtotal, taxa, total } = totais;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sticky bottom-4">
      <p className="eyebrow text-photo-primary mb-3">
        {fotos.length} foto{fotos.length > 1 ? 's' : ''} selecionada{fotos.length > 1 ? 's' : ''}
      </p>
      <div className="space-y-1 text-sm text-photo-ink">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Taxa Pix (2,99% + R$0,30)</span>
          <span>{fmt(taxa)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
          <span>Total</span>
          <span className="text-photo-primary">{fmt(total)}</span>
        </div>
      </div>
      <button
        onClick={() => navigate('/checkout')}
        className="btn btn-primary w-full mt-3"
      >
        Proceder para Pagamento →
      </button>
    </div>
  );
}
