import { Link, useLocation } from 'react-router-dom';
import { moduloLigado, useSite } from '../../shared/site.js';

export default function Header() {
  const location = useLocation();
  const site = useSite();
  const eventsActive = location.pathname === '/buscar' || location.pathname.startsWith('/evento/');
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label={`${site.nome} - Início`}>
          <img src="/assets/logo-paroquia-sao-rafael.png" alt={site.nome} />
        </Link>
        <nav aria-label="Navegação principal">
          <ul className="nav-list">
            <li><Link to="/">Início</Link></li>
            <li><a href="/#sobre">Sobre</a></li>
            <li><a href="/#sacramentos">Sacramentos</a></li>
            {moduloLigado(site, 'busca') && <li><Link className={eventsActive ? 'ativo' : undefined} to="/buscar">Eventos</Link></li>}
            {moduloLigado(site, 'agenda') && <li><Link className={location.pathname === '/agenda' ? 'ativo' : undefined} to="/agenda">Agenda</Link></li>}
            <li><Link to="/recuperar-pedido">Recuperar pedido</Link></li>
            {moduloLigado(site, 'ajuda') && <li><Link className={location.pathname === '/ajuda' ? 'ativo' : undefined} to="/ajuda">Ajuda</Link></li>}
            <li><Link className={location.pathname === '/pascom' ? 'ativo' : undefined} to="/pascom">Pascom</Link></li>
            <li><a href="/#contato">Contato</a></li>
          </ul>
        </nav>
        <a className="header-action" href="/#contato">Doe Agora</a>
      </div>
    </header>
  );
}
