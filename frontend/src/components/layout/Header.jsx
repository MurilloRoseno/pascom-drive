import { Link, useNavigate } from 'react-router-dom';
import { useCarrinho } from '../../hooks/useCarrinho.js';

export default function Header() {
  const { fotos } = useCarrinho();
  const navigate = useNavigate();
  return (
    <header className="parish-header">
      <div className="parish-nav">
        <Link to="/" className="parish-brand" aria-label="Paroquia Sao Rafael - inicio">
          <img src="/assets/logo-header.png" alt="" />
          <div>
            <span>Paroquia</span>
            <strong>Sao Rafael</strong>
            <small>Acailandia - Maranhao</small>
          </div>
        </Link>
        <nav className="parish-links" aria-label="Navegacao principal">
          <Link to="/buscar">Eventos</Link>
          <a href="#contato">Contato</a>
        </nav>
        <button type="button" className="header-cart" onClick={() => navigate('/checkout')}>
          Carrinho
          <span>{fotos.length}</span>
        </button>
      </div>
    </header>
  );
}
