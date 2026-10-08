/* eslint-disable react/prop-types */
import { SignIn, UserButton, useAuth, useUser } from '@clerk/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { pascomDashboard, pascomMe, pascomPedidoDetalhe, pascomPedidos, pascomRegenerarDownloads } from '../lib/api.js';
import { clerkConfigured } from './clerkConfig.js';
import '../pages/pascom.css';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

function PascomAuthenticated({ onBackPublic }) {
  const { getToken, signOut } = useAuth();
  const [me, setMe] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');

  const withToken = useCallback(async (fn) => {
    const token = await getToken();
    return fn(token);
  }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const [meResult, dashboardResult, pedidosResult] = await Promise.all([
        pascomMe(token),
        pascomDashboard(token),
        pascomPedidos(token, filters),
      ]);
      setMe(meResult.user);
      setDashboard(dashboardResult.dashboard);
      setPedidos(pedidosResult.pedidos);
      setSelectedId((current) => current || pedidosResult.pedidos[0]?.id || '');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, [filters, getToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let alive = true;
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    withToken((token) => pascomPedidoDetalhe(token, selectedId))
      .then((result) => alive && setDetail(result))
      .catch((cause) => alive && setError(cause.message));
    return () => { alive = false; };
  }, [selectedId, withToken]);

  const regenerate = async () => {
    if (!selectedId) return;
    setAction('Regenerando links...');
    setError('');
    try {
      const result = await withToken((token) => pascomRegenerarDownloads(token, selectedId));
      setAction(`${result.downloads.length} link(s) regenerado(s).`);
      setDetail(await withToken((token) => pascomPedidoDetalhe(token, selectedId)));
    } catch (cause) {
      setError(cause.message);
      setAction('');
    }
  };

  const stats = useMemo(() => [
    ['Vendas hoje', currency.format(dashboard?.revenueToday || 0)],
    ['Pedidos hoje', dashboard?.ordersToday ?? 0],
    ['Mês atual', currency.format(dashboard?.revenueMonth || 0)],
    ['Downloads ativos', dashboard?.activeDownloads ?? 0],
  ], [dashboard]);

  if (/sem permissao|permissao/i.test(error)) {
    return <PermissionDenied signOut={signOut} onBackPublic={onBackPublic} />;
  }

  return (
    <div className="pascom-console">
      <header className="pascom-hero">
        <div>
          <span className="pascom-eyebrow">Painel Pascom</span>
          <h1>{me?.name ? `Olá, ${me.name}` : 'Operação de pedidos'}</h1>
          <p>Pedidos, downloads, suporte e métricas básicas da venda de fotos.</p>
        </div>
        <div className="pascom-user-actions">
          <UserButton afterSignOutUrl={onBackPublic ? '/perfil' : '/pascom'} />
          {onBackPublic && <button className="pascom-secondary" onClick={onBackPublic}>Área pública</button>}
        </div>
      </header>

      {error && <div className="pascom-alert">{error}</div>}
      {action && <div className="pascom-alert success">{action}</div>}

      <section className="pascom-stat-grid">
        {stats.map(([label, value]) => <article className="pascom-stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </section>

      <section className="pascom-grid">
        <div className="pascom-card">
          <div className="pascom-toolbar">
            <div>
              <span className="pascom-eyebrow">Pedidos</span>
              <h2>Atendimento e suporte</h2>
            </div>
            <button className="pascom-secondary" onClick={load} disabled={loading}>{loading ? 'Carregando...' : 'Atualizar'}</button>
          </div>
          <div className="pascom-filters">
            <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Buscar por pedido, e-mail ou WhatsApp" />
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Todos os status</option>
              <option value="Pagamento Confirmado">Pagamento Confirmado</option>
              <option value="Pagamento Pendente">Pagamento Pendente</option>
              <option value="PagamentoDivergente">PagamentoDivergente</option>
            </select>
          </div>
          <div className="pascom-order-list">
            {pedidos.map((pedido) => (
              <button key={pedido.id} className={pedido.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(pedido.id)}>
                <strong>{pedido.id}</strong>
                <span>{pedido.email || pedido.whatsapp || pedido.name}</span>
                <small>{pedido.status} · {currency.format(pedido.total || 0)}</small>
              </button>
            ))}
            {!loading && pedidos.length === 0 && <p className="pascom-empty">Nenhum pedido encontrado.</p>}
          </div>
        </div>

        <div className="pascom-card pascom-detail">
          <span className="pascom-eyebrow">Detalhe</span>
          {!detail && <p className="pascom-empty">Selecione um pedido para ver itens, downloads e entrega.</p>}
          {detail && (
            <>
              <h2>{detail.pedido.id}</h2>
              <dl className="pascom-definition">
                <div><dt>Status</dt><dd>{detail.pedido.status}</dd></div>
                <div><dt>Comprador</dt><dd>{detail.pedido.name || detail.pedido.email}</dd></div>
                <div><dt>Contato</dt><dd>{detail.pedido.email}<br />{detail.pedido.whatsapp}</dd></div>
                <div><dt>Total</dt><dd>{currency.format(detail.pedido.total || 0)}</dd></div>
              </dl>
              <h3>Fotos compradas</h3>
              <ul className="pascom-lines">{detail.itens.map((item) => <li key={`${item.fotoId}-${item.eventoId}`}><span>{item.eventTitle}</span><strong>{item.fotoId}</strong></li>)}</ul>
              <h3>Downloads</h3>
              <ul className="pascom-lines">{detail.downloads.map((download) => <li key={download.downloadId}><span>{download.fotoId}</span><strong>{download.uses}/{download.maxUses}</strong></li>)}</ul>
              <button className="pascom-primary" onClick={regenerate} disabled={detail.pedido.status !== 'Pagamento Confirmado'}>Regenerar downloads</button>
            </>
          )}
        </div>
      </section>
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
