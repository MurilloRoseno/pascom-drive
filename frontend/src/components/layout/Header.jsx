import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const eventsActive = location.pathname === '/buscar' || location.pathname.startsWith('/evento/');
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="Paróquia São Rafael - Início">
          <picture>
            <source srcSet="/assets/logo-header-2x.webp" type="image/webp" />
            <img src="/assets/logo-header-2x.png" alt="Paróquia São Rafael" width="150" height="72" />
          </picture>
        </Link>
        <nav aria-label="Navegação principal">
          <ul className="nav-list">
            <li><Link to="/">Início</Link></li>
            <li><a href="/#sobre">Sobre</a></li>
            <li><a href="/#sacramentos">Sacramentos</a></li>
            <li><Link className={eventsActive ? 'ativo' : undefined} to="/buscar">Eventos</Link></li>
            <li><Link to="/recuperar-pedido">Recuperar pedido</Link></li>
            <li><a href="/#contato">Contato</a></li>
          </ul>
        </nav>
        <a className="header-action" href="/doar">Doe Agora</a>
      </div>
    </header>
  );
}
