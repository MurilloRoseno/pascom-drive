import { Link } from 'react-router-dom';
import { formatarTelefone, linkWhatsapp, moduloLigado, useSite } from '../../shared/site.js';

export default function Footer() {
  const site = useSite();
  const { whatsapp } = site;
  const linkZap = linkWhatsapp(whatsapp);
  return (
    <footer id="contato" className="institutional-footer">
      <section className="inst-footer-invite">
        <div className="inst-footer-container inst-footer-invite-inner">
          <div>
            <span className="inst-footer-kicker">Secretaria Paroquial</span>
            <h2 className="inst-footer-heading">Estamos aqui para acolher sua família.</h2>
            <p className="inst-footer-summary">Informações sobre celebrações, sacramentos, agenda paroquial e atendimento da comunidade.</p>
          </div>
          <div className="inst-footer-actions">
            {whatsapp && (
              <a className="inst-footer-button primary" href={linkZap} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.49 0 .15 5.34.15 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.64a11.9 11.9 0 0 0 5.79 1.48h.01c6.58 0 11.92-5.34 11.92-11.92 0-3.18-1.24-6.17-3.48-8.44zm-8.45 18.34h-.01a9.94 9.94 0 0 1-5.06-1.39l-.36-.21-3.73.97 1-3.64-.24-.37a9.9 9.9 0 0 1-1.52-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.03 7.04 2.91a9.87 9.87 0 0 1 2.91 7.05c0 5.49-4.47 9.96-9.97 9.96z" /></svg>
                Falar no WhatsApp
              </a>
            )}
            {site.email && (
            <a className="inst-footer-button secondary" href={`mailto:${site.email}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              Enviar e-mail
            </a>
            )}
          </div>
        </div>
      </section>
      <div className="inst-footer-main">
        <div className="inst-footer-container inst-footer-grid">
          <section>
            <Link to="/" className="inst-footer-logo" aria-label={site.nome}>
              <img className="logo-img--footer" src="/assets/logo-white.png" alt={`Logo da ${site.nome}`} />
            </Link>
            <p className="inst-footer-mission">Anunciando o Evangelho, celebrando a fé e servindo a comunidade de Açailândia com caridade e acolhimento.</p>
          </section>
          <section aria-label="Navegação do rodapé">
            <h3 className="inst-footer-title">Institucional</h3>
            <ul className="inst-footer-links">
              <li><Link to="/">Início</Link></li>
              <li><a href="/#sobre">Sobre a Paróquia</a></li>
              <li><a href="/#sacramentos">Sacramentos</a></li>
              {moduloLigado(site, 'busca') && <li><Link to="/buscar">Eventos</Link></li>}
              {moduloLigado(site, 'agenda') && <li><Link to="/agenda">Agenda</Link></li>}
              {moduloLigado(site, 'ajuda') && <li><Link to="/ajuda">Central de ajuda</Link></li>}
              <li><Link to="/recuperar-pedido">Recuperar pedido</Link></li>
              <li><Link to="/pascom">Área Pascom</Link></li>
              <li><Link to="/privacidade">Política de Privacidade</Link></li>
              <li><a href="/#contato">Contato</a></li>
            </ul>
          </section>
          <section>
            <h3 className="inst-footer-title">Contato</h3>
            <ul className="inst-footer-info">
              {site.endereco && (
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <span>{site.endereco}</span>
                </li>
              )}
              {whatsapp && (
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.47" /></svg>
                  <a href={linkZap} target="_blank" rel="noopener noreferrer">{formatarTelefone(whatsapp)}</a>
                </li>
              )}
              {site.email && (
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </li>
              )}
            </ul>
            {site.horario && <div className="inst-footer-hours"><strong>Horário da secretaria</strong>{site.horario}</div>}
          </section>
          <section>
            <h3 className="inst-footer-title">Comunidade</h3>
            {site.versiculo && <p className="inst-footer-verse">“{site.versiculo}”</p>}
            {site.versiculo && site.referencia && <p className="inst-footer-citation">{site.referencia}</p>}
            <div className="inst-footer-social">
              {site.facebook && (
                <a href={site.facebook} aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                </a>
              )}
              {site.instagram && (
                <a href={site.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                </a>
              )}
              {site.youtube && (
                <a href={site.youtube} aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15 12l-5.25 3.02z" /></svg>
                </a>
              )}
              {whatsapp && (
                <a href={linkZap} aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.49 0 .15 5.34.15 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.64a11.9 11.9 0 0 0 5.79 1.48h.01c6.58 0 11.92-5.34 11.92-11.92 0-3.18-1.24-6.17-3.48-8.44zm-8.45 18.34h-.01a9.94 9.94 0 0 1-5.06-1.39l-.36-.21-3.73.97 1-3.64-.24-.37a9.9 9.9 0 0 1-1.52-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.03 7.04 2.91a9.87 9.87 0 0 1 2.91 7.05c0 5.49-4.47 9.96-9.97 9.96z" /></svg>
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
      <div className="inst-footer-legal">
        <div className="inst-footer-container inst-footer-legal-inner">
          <span>© {new Date().getFullYear()} {site.nome}. Todos os direitos reservados.</span>
          <span>{site.cidade} · <Link to="/privacidade">Privacidade</Link></span>
        </div>
      </div>
      <div className="inst-footer-motto" aria-hidden="true">
        <img src="/assets/footer-motto.svg" alt="" draggable="false" />
      </div>
    </footer>
  );
}
