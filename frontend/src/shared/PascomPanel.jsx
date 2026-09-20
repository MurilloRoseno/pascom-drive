/* eslint-disable react/prop-types */
import { SignIn, UserButton, useAuth, useUser } from '@clerk/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { pascomMe, pascomSistema } from '../lib/api.js';
import { clerkConfigured } from './clerkConfig.js';
import EventsTab from './pascom/EventsTab.jsx';
import OrdersTab from './pascom/OrdersTab.jsx';
import SistemaTab from './pascom/SistemaTab.jsx';
import UploadTab from './pascom/UploadTab.jsx';
import './pascom/pascom-upload.css';
import './pascom/pascom-events.css';
import './pascom/pascom-sistema.css';
import '../pages/pascom.css';
// Depois de pascom.css: ajusta a grade de numeros da aba Pedidos.
import './pascom/pascom-pedidos.css';

const pascomClerkAppearance = {
  variables: {
    colorPrimary: '#5a176e',
    colorText: '#281332',
    colorTextSecondary: '#71647a',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#281332',
    borderRadius: '16px',
  },
  elements: {
    rootBox: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
    cardBox: {
      width: '100%',
      maxWidth: '430px',
      borderRadius: '24px',
      boxShadow: '0 24px 70px rgba(58, 19, 75, 0.14)',
    },
    footerPages: {
      display: 'none',
    },
    footerPageLink: {
      display: 'none',
    },
  },
};

export default function PascomPanel({ mobile = false, onBackPublic }) {
  if (!clerkConfigured) {
    return (
      <div className={mobile ? 'pascom-mobile-shell' : 'pascom-page'}>
        <div className="pascom-card pascom-auth-card">
          <span className="pascom-eyebrow">Configuração pendente</span>
          <h1>Área Pascom protegida por Clerk</h1>
          <p>Defina `VITE_CLERK_PUBLISHABLE_KEY` no frontend e `CLERK_SECRET_KEY` no backend para habilitar o login da equipe.</p>
          {onBackPublic && <button className="pascom-secondary" onClick={onBackPublic}>Voltar para área pública</button>}
        </div>
      </div>
    );
  }
  return (
    <div className={mobile ? 'pascom-mobile-shell' : 'pascom-page'}>
      <PascomAuthGate mobile={mobile} onBackPublic={onBackPublic} />
    </div>
  );
}

function PascomAuthGate({ mobile, onBackPublic }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <div className="pascom-card pascom-auth-card"><p>Carregando autenticação...</p></div>;
  if (!isSignedIn) {
    return (
      <div className="pascom-auth-layout pascom-auth-layout-centered">
        <SignIn routing="hash" afterSignInUrl={mobile ? '/perfil' : '/pascom'} signUpUrl={mobile ? '/perfil' : '/pascom'} appearance={pascomClerkAppearance} />
        {onBackPublic && <button className="pascom-secondary pascom-auth-back" onClick={onBackPublic}>Voltar para área pública</button>}
      </div>
    );
  }
  return <PascomAuthenticated onBackPublic={onBackPublic} />;
}

const PANEL_TABS = [['eventos', 'Eventos'], ['envio', 'Enviar fotos'], ['pedidos', 'Pedidos'], ['sistema', 'Sistema']];

// Uma verificacao ao abrir o painel (sem polling): alimenta o selo da aba Sistema.
function useSistema(getToken) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await pascomSistema(await getToken());
      setState({ data, loading: false, error: '' });
    } catch (cause) {
      setState((current) => ({ ...current, loading: false, error: cause.message }));
    }
  }, [getToken]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

function rotuloAba(id, label, sistema) {
  if (id !== 'sistema' || !sistema) return label;
  if (sistema.resumo.erros) return `${label} · ${sistema.resumo.erros} ${sistema.resumo.erros === 1 ? 'erro' : 'erros'}`;
  return label;
}

function PascomAuthenticated({ onBackPublic }) {
  const { getToken, signOut } = useAuth();
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState('');
  const [tab, setTab] = useState('eventos');
  const [focusNomePasta, setFocusNomePasta] = useState('');
  const sistema = useSistema(getToken);
  // Cada aba e montada na primeira visita e depois so escondida: trocar de aba
  // nao interrompe um envio em andamento nem recarrega listas a toa.
  const opened = useRef(new Set());
  opened.current.add(tab);

  useEffect(() => {
    let alive = true;
    getToken()
      .then((token) => pascomMe(token))
      .then((result) => alive && setMe(result.user))
      .catch((cause) => alive && setMeError(cause.message));
    return () => { alive = false; };
  }, [getToken]);

  const verEventos = useCallback((nomePasta) => {
    setFocusNomePasta(nomePasta || '');
    setTab('eventos');
  }, []);

  if (/sem permissao|permissao/i.test(meError)) {
    return <PermissionDenied signOut={signOut} onBackPublic={onBackPublic} />;
  }

  const panes = {
    eventos: () => <EventsTab getToken={getToken} focusNomePasta={focusNomePasta} onGoUpload={() => setTab('envio')} />,
    envio: () => <UploadTab getToken={getToken} onVerEventos={verEventos} />,
    pedidos: () => <OrdersTab getToken={getToken} />,
    sistema: () => (
      <SistemaTab getToken={getToken} sistema={sistema.data} loading={sistema.loading} error={sistema.error} onReload={sistema.reload} />
    ),
  };

  return (
    <div className="pascom-console">
      <header className="pascom-hero">
        <div>
          <span className="pascom-eyebrow">Painel Pascom</span>
          <h1>{me?.name ? `Olá, ${me.name}` : 'Painel Pascom'}</h1>
          <p>Eventos, envio de fotos, pedidos e downloads da venda de fotos.</p>
        </div>
        <div className="pascom-user-actions">
          <UserButton afterSignOutUrl={onBackPublic ? '/perfil' : '/pascom'} />
          {onBackPublic && <button className="pascom-secondary" onClick={onBackPublic}>Área pública</button>}
        </div>
      </header>

      {meError && <div className="pascom-alert">{meError}</div>}

      <nav className="pascom-tabs" role="tablist" aria-label="Áreas do painel">
        {PANEL_TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={[tab === id ? 'active' : '', id === 'sistema' && sistema.data?.resumo.erros ? 'has-alert' : ''].filter(Boolean).join(' ')} onClick={() => setTab(id)}>
            {rotuloAba(id, label, sistema.data)}
          </button>
        ))}
      </nav>

      {PANEL_TABS.filter(([id]) => opened.current.has(id)).map(([id]) => (
        <div key={id} role="tabpanel" hidden={tab !== id} className="pascom-tabpanel">{panes[id]()}</div>
      ))}
    </div>
  );
}

function PermissionDenied({ signOut, onBackPublic }) {
  return (
    <div className="pascom-card pascom-auth-card">
      <span className="pascom-eyebrow">Sem permissão</span>
      <h1>Seu login não está na EquipePascom</h1>
      <p>Peça para incluir seu e-mail ou celular ativo na aba `EquipePascom` da planilha antes de acessar o painel operacional.</p>
      <div className="pascom-user-actions">
        <button className="pascom-primary" onClick={() => signOut()}>Sair</button>
        {onBackPublic && <button className="pascom-secondary" onClick={onBackPublic}>Área pública</button>}
      </div>
    </div>
  );
}
