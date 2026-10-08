import { useNavigate, useLocation } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';

export default function CartSummary() {
  const { fotos } = useCarrinho();
  const navigate = useNavigate();
  const location = useLocation();
  if (!fotos.length || location.pathname === '/checkout') return null;
  return (
    <aside className="floating-cart" aria-label="Resumo do carrinho">
      <div>
        <strong>{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</strong>
        <span>Subtotal confirmado no checkout</span>
      </div>
      <button type="button" onClick={() => navigate('/checkout')}>Finalizar compra</button>
    </aside>
  );
}
