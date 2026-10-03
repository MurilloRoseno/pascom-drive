import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import AssistenteChat from './AssistenteChat.jsx';
import { useContato } from '../shared/contato.js';
import '../shared/ajuda-agenda.css';

/** Telas em que o botão atrapalharia (pagamento) ou seria repetido (a própria ajuda). */
function escondido({ pathname, search }) {
  return pathname === '/ajuda' || pathname === '/checkout' || pathname.startsWith('/pagamento/') || search.includes('view=foto');
}

/**
 * Botão flutuante do assistente, em todas as telas do site público. Só aparece quando o
 * assistente está ligado no painel. `acima` sobe o botão quando a barra do carrinho está à mostra.
 */
export default function AssistenteFlutuante({ mobile = false, acima = false }) {
  const { assistenteAtivo } = useContato();
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const fechado = escondido(location);

  useEffect(() => { setAberto(false); }, [location.pathname]);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', aoTeclar);
    document.getElementById('pergunta-assistente')?.focus();
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  if (!assistenteAtivo || fechado) return null;

  return (
    <div className="aa">
      {aberto && (
        <div role="dialog" aria-label="Assistente" className={`aa-janela${mobile ? ' aa-janela--mobile' : ''}`}>
          <div className="aa-janela__topo">
            <Link to="/ajuda" className="aa-link">Abrir a Central de Ajuda</Link>
            <button type="button" className="aa-btn" onClick={() => setAberto(false)} aria-label="Fechar o assistente">✕</button>
          </div>
          <AssistenteChat titulo={false} />
        </div>
      )}
      <button
        type="button"
        className={`aa-fab${mobile ? ' aa-fab--mobile' : ''}${acima ? ' aa-fab--acima' : ''}`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
        {aberto ? 'Fechar' : 'Assistente'}
      </button>
    </div>
  );
}

AssistenteFlutuante.propTypes = { mobile: PropTypes.bool, acima: PropTypes.bool };
