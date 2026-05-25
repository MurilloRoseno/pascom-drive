import { useNavigate, useLocation } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';

const money = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;

export default function CartSummary() {
  const { fotos, totais } = useCarrinho();
  const navigate = useNavigate();
  const location = useLocation();
  if (!fotos.length || location.pathname === '/checkout') return null;
  return (
    <aside className="floating-cart" aria-label="Resumo do carrinho">
      <div>
        <strong>{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</strong>
        <span>Subtotal {money(totais.subtotal)}</span>
      </div>
      <button type="button" onClick={() => navigate('/checkout')}>Finalizar compra</button>
    </aside>
  );
}
