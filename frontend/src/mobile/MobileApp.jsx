/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext.jsx';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { categories, categoryLabel } from '../data/categories.js';
import { listarEventos, listarFotosEvento, obterEvento, validarAcessoGaleria, cotarCheckout, criarPagamento, statusPagamento } from '../lib/api.js';
import { checkoutSchema } from '../lib/validation.js';
import { dateLabel, scheduleLabel } from '../lib/event-format.js';
import { galleryToken, money, normalizePhoto, saveGalleryToken } from '../shared/gallery.js';
import './mobile.css';
import './mobile-overlays.css';

const iconPath = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  search: 'm21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z',
  calendar: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  bag: 'M6 8h12l-1 13H7L6 8Zm3 0a3 3 0 0 1 6 0',
  back: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 13 4 4L19 7',
  close: 'M6 6l12 12M18 6 6 18',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  pin: 'M12 21s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
};

function Icon({ name, className = 'm-icon' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPath[name]} /></svg>;
}

function useEventos({ q = '', categoria = '' } = {}) {
  const [state, setState] = useState({ loading: true, error: '', eventos: [] });
  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    listarEventos({ q, categoria })
      .then(({ eventos }) => alive && setState({ loading: false, error: '', eventos }))
      .catch((error) => alive && setState({ loading: false, error: error.message, eventos: [] }));
    return () => { alive = false; };
  }, [q, categoria]);
  return state;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), [pathname, search]);
  return null;
}

function MobileRoutes() {
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const { fotos } = useCarrinho();
  const hideChrome = location.pathname === '/checkout' || location.pathname.startsWith('/pagamento/');
  return (
    <div className="mobile-app">
      <ScrollToTop />
      {!hideChrome && <MobileTopBar openCart={() => setCartOpen(true)} />}
      <Routes>
        <Route path="/" element={<MobileHome />} />
        <Route path="/buscar" element={<MobileSearch />} />
        <Route path="/categoria" element={<Navigate replace to={`/buscar${location.search}`} />} />
        <Route path="/evento/:eventoId" element={<MobileEvent />} />
        <Route path="/checkout" element={<MobileCheckout />} />
        <Route path="/pagamento/:resultado" element={<MobilePaymentReturn />} />
      </Routes>
      {!hideChrome && <BottomNav />}
      {fotos.length > 0 && !hideChrome && !cartOpen && <FloatingCart onClick={() => setCartOpen(true)} />}
      {cartOpen && <CartSheet close={() => setCartOpen(false)} />}
    </div>
  );
}

export default function MobileApp() {
  return (
    <BrowserRouter>
      <CarrinhoProvider>
        <MobileRoutes />
      </CarrinhoProvider>
    </BrowserRouter>
  );
}

function MobileTopBar({ openCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { fotos } = useCarrinho();
  const canBack = location.pathname !== '/';
  return (
    <header className="m-appbar">
      <button className="m-icon-btn" onClick={() => (canBack ? navigate(-1) : navigate('/'))} aria-label={canBack ? 'Voltar' : 'Início'}>
        {canBack ? <Icon name="back" /> : <img src="/assets/logo-header.png" alt="" />}
      </button>
      <div><strong>Pascom Drive</strong><span>Paróquia São Rafael</span></div>
      <button className="m-icon-btn" onClick={openCart} aria-label="Abrir carrinho">
        <Icon name="bag" />{fotos.length > 0 && <em>{fotos.length}</em>}
      </button>
    </header>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    ['/', 'home', 'Início'],
    ['/buscar', 'search', 'Galerias'],
    ['/buscar?categoria=celebracoes', 'calendar', 'Agenda'],
  ];
  return <nav className="m-bottom">{items.map(([to, icon, label]) => <Link key={label} className={pathname === to.split('?')[0] ? 'active' : ''} to={to}><Icon name={icon} /><span>{label}</span></Link>)}</nav>;
}

function MobileHome() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { eventos, loading } = useEventos({});
  const recentes = eventos.slice(0, 4);
  function submit(event) {
    event.preventDefault();
    navigate(`/buscar${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }
  return (
    <main className="m-screen">
      <section className="m-hero">
        <p>Açailândia · Maranhão</p>
        <h1>Galerias da comunidade no seu bolso.</h1>
        <span>“A serviço da memória, da fé e das famílias.”</span>
        <form className="m-search" onSubmit={submit}><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar celebração, sacramento..." /></form>
      </section>
      <section className="m-section">
        <div className="m-eyebrow">Explore por sacramento</div>
        <div className="m-chip-grid">{categories.slice(0, 6).map((cat) => <button key={cat.id} onClick={() => navigate(`/buscar?categoria=${cat.id}`)}>{cat.label}</button>)}</div>
      </section>
      <section className="m-section">
        <div className="m-row-title"><div><div className="m-eyebrow">Galerias</div><h2>Eventos recentes</h2></div><Link to="/buscar">Ver todas</Link></div>
        {loading ? <SkeletonList /> : <div className="m-card-list">{recentes.map((event) => <EventCard key={event.eventoId} event={event} />)}</div>}
      </section>
      <section className="m-callout">
        <div className="m-eyebrow">Secretaria Paroquial</div>
        <h2>Estamos aqui para acolher sua família.</h2>
        <p>Confira eventos, escolha fotos e receba os links com segurança após o pagamento.</p>
      </section>
    </main>
  );
}

function MobileSearch() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const categoria = params.get('categoria') || '';
  const filters = useMemo(() => ({ q: params.get('q') || '', categoria }), [params, categoria]);
  const { eventos, loading, error } = useEventos(filters);
  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (categoria) next.set('categoria', categoria);
    setParams(next);
  }
  function setCategory(slug) {
    const next = new URLSearchParams(params);
    if (slug) next.set('categoria', slug); else next.delete('categoria');
    setParams(next);
  }
  return (
    <main className="m-screen">
      <section className="m-hero compact"><p>Galerias da Comunidade</p><h1>Encontre seu evento.</h1><form className="m-search" onSubmit={submit}><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, mês ou sacramento" /></form></section>
      <div className="m-chips"><button className={!categoria ? 'active' : ''} onClick={() => setCategory('')}>Todos</button>{categories.map((cat) => <button key={cat.id} className={categoria === cat.id ? 'active' : ''} onClick={() => setCategory(cat.id)}>{cat.label}</button>)}</div>
      <section className="m-section">{error && <p className="m-error">{error}</p>}{loading ? <SkeletonList /> : eventos.length ? <div className="m-card-list">{eventos.map((event) => <EventCard key={event.eventoId} event={event} />)}</div> : <EmptyState text="Nenhum evento encontrado." />}</section>
    </main>
  );
}

function EventCard({ event }) {
  return (
    <Link className="m-event-card" to={`/evento/${encodeURIComponent(event.eventoId)}`}>
      <img src={event.coverThumbnail || event.cover || '/assets/hero-igreja-sao-rafael.webp'} alt="" loading="lazy" />
      <div><span>{categoryLabel(event.category)}</span><h3>{event.title}</h3><p>{scheduleLabel(event)} · {event.location || 'Paróquia São Rafael'}</p><small>{event.totalFotos || 0} fotos · {event.visibility === 'protegida' ? 'Acesso protegido' : 'Galeria pública'}</small></div>
    </Link>
  );
}

function MobileEvent() {
  const { eventoId } = useParams();
  const [params, setParams] = useSearchParams();
  const { addFoto, removeFoto, isSelected } = useCarrinho();
  const [state, setState] = useState({ loading: true, event: null, photos: [], error: '', locked: false });
  const [code, setCode] = useState('');

  const loadPhotos = useCallback(async (event) => {
    if (event.visibility === 'protegida' && !galleryToken(eventoId)) {
      setState((current) => ({ ...current, loading: false, locked: true }));
      return;
    }
    const result = await listarFotosEvento(eventoId, galleryToken(eventoId));
    setState({ loading: false, event, photos: result.photos.map((photo) => normalizePhoto({ ...photo, watermarkedPreview: true })), error: '', locked: false });
  }, [eventoId]);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, event: null, photos: [], error: '', locked: false });
    obterEvento(eventoId)
      .then(({ event }) => alive && loadPhotos(event))
      .catch(() => alive && setState({ loading: false, event: null, photos: [], error: 'Galeria indisponível.', locked: false }));
    return () => { alive = false; };
  }, [eventoId, loadPhotos]);

  async function unlock(event) {
    event.preventDefault();
    try {
      const result = await validarAcessoGaleria(eventoId, code);
      saveGalleryToken(eventoId, result.token);
      setState((current) => ({ ...current, loading: true, error: '' }));
      await loadPhotos(state.event);
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    }
  }

  function toggle(photo) {
    if (!state.event?.salesAuthorized || photo.availableForSale !== true) return;
    if (isSelected(photo.id)) removeFoto(photo.id);
    else addFoto({ ...photo, event: state.event.title, eventoId: state.event.eventoId, url: photo.previewUrl });
  }

  if (state.loading) return <main className="m-screen"><SkeletonList /></main>;
  if (!state.event) return <main className="m-screen"><EmptyState text={state.error || 'Evento não encontrado.'} /></main>;
  const activePhoto = state.photos.find((photo) => photo.id === params.get('foto'));

  return (
    <main className="m-screen">
      <section className="m-event-hero"><img src={state.event.cover || '/assets/hero-igreja-sao-rafael.webp'} alt="" /><div><p>{categoryLabel(state.event.category)}</p><h1>{state.event.title}</h1><span>{dateLabel(state.event)} · {state.event.location || 'Paróquia São Rafael'}</span></div></section>
      {state.locked ? <AccessCard code={code} setCode={setCode} error={state.error} unlock={unlock} /> : (
        <section className="m-section">
          <div className="m-row-title"><div><div className="m-eyebrow">Fotos do evento</div><h2>{state.photos.length} fotos</h2></div><small>{state.event.salesAuthorized ? 'Toque para selecionar' : 'Venda indisponível'}</small></div>
          <div className="m-photo-grid">{state.photos.map((photo, index) => <button key={photo.id} className={isSelected(photo.id) ? 'selected' : ''} onClick={() => setParams({ foto: photo.id })}><img src={photo.thumbnailUrl} alt={photo.caption} loading="lazy" /><span>{String(index + 1).padStart(2, '0')}</span>{isSelected(photo.id) && <em><Icon name="check" /></em>}</button>)}</div>
        </section>
      )}
      {activePhoto && <Lightbox event={state.event} photo={activePhoto} photos={state.photos} setParams={setParams} toggle={toggle} selected={isSelected(activePhoto.id)} />}
    </main>
  );
}

function AccessCard({ code, setCode, error, unlock }) {
  return <section className="m-section"><form className="m-access" onSubmit={unlock}><Icon name="lock" className="m-icon big" /><h2>Galeria protegida</h2><p>Informe o código compartilhado pela secretaria.</p><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código do evento" />{error && <p className="m-error">{error}</p>}<button className="m-primary">Acessar galeria</button></form></section>;
}

function Lightbox({ event, photo, photos, setParams, toggle, selected }) {
  const current = photos.findIndex((item) => item.id === photo.id);
  const go = (offset) => setParams({ foto: photos[(current + offset + photos.length) % photos.length].id }, { replace: true });
  return (
    <div className="m-lightbox"><button className="m-icon-btn close" onClick={() => setParams({}, { replace: true })}><Icon name="close" /></button><img src={photo.previewUrl} alt={photo.caption} /><div className="m-lightbox-panel"><p>{String(current + 1).padStart(2, '0')} / {photos.length}</p><h2>{event.title}</h2><span><Icon name="lock" /> Prévia protegida. A foto comprada é entregue sem marca d&apos;água.</span><div className="m-lightbox-actions"><button onClick={() => go(-1)}><Icon name="back" /></button><button onClick={() => toggle(photo)} className="m-primary">{selected ? 'Foto selecionada' : `Selecionar · ${money(photo.price || 10)}`}</button><button onClick={() => go(1)}><Icon name="right" /></button></div></div></div>
  );
}

function FloatingCart({ onClick }) {
  const { fotos } = useCarrinho();
  const total = fotos.reduce((sum, photo) => sum + Number(photo.price || 10), 0);
  return <button className="m-cart-bar" onClick={onClick}><Icon name="bag" /><div><strong>{fotos.length} foto{fotos.length > 1 ? 's' : ''}</strong><span>Subtotal {money(total)}</span></div><em>Finalizar</em></button>;
}

function CartSheet({ close }) {
  const navigate = useNavigate();
  const { fotos, removeFoto } = useCarrinho();
  const subtotal = fotos.reduce((sum, photo) => sum + Number(photo.price || 10), 0);
  return (
    <div className="m-sheet-overlay" onClick={close}><aside className="m-sheet" onClick={(e) => e.stopPropagation()}><i /><div className="m-row-title"><div><div className="m-eyebrow">Sua seleção</div><h2>{fotos.length} fotos</h2></div><button className="m-icon-btn" onClick={close}><Icon name="close" /></button></div>{fotos.length === 0 ? <EmptyState text="Nenhuma foto selecionada." /> : <div className="m-cart-list">{fotos.map((photo) => <div key={photo.id}><img src={photo.url || photo.thumbnailUrl} alt="" /><div><strong>{photo.event}</strong><span>{money(photo.price)}</span></div><button onClick={() => removeFoto(photo.id)}>Remover</button></div>)}</div>}<div className="m-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>{fotos.length > 0 && <button className="m-primary block" onClick={() => { close(); navigate('/checkout'); }}>Finalizar no Mercado Pago</button>}</aside></div>
  );
}

function MobileCheckout() {
  const { fotos, removeFoto } = useCarrinho();
  const [buyer, setBuyer] = useState({ name: '', email: '', whatsapp: '' });
  const [method, setMethod] = useState('pix');
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const tokens = useCallback(() => Object.fromEntries([...new Set(fotos.map((photo) => photo.eventoId))].map((id) => [id, galleryToken(id)])), [fotos]);
  useEffect(() => {
    if (!fotos.length) return;
    cotarCheckout({ fotoIds: fotos.map((photo) => photo.id), paymentMethod: method, galleryTokens: tokens() }).then(({ pricing }) => setPricing(pricing)).catch((error) => setError(error.message));
  }, [fotos, method, tokens]);
  async function pay() {
    const valid = checkoutSchema.safeParse(buyer);
    if (!valid.success) return setError(valid.error.errors[0].message);
    setLoading(true);
    try {
      const response = await criarPagamento({ ...buyer, fotoIds: fotos.map((photo) => photo.id), paymentMethod: method, galleryTokens: tokens() });
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setError(error.message); setLoading(false);
    }
  }
  if (!fotos.length) return <main className="m-screen"><EmptyState text="Seu carrinho está vazio." /><Link className="m-primary block" to="/buscar">Encontrar fotos</Link></main>;
  return (
    <main className="m-screen checkout">
      <section className="m-hero compact"><p>Compra segura</p><h1>Finalizar compra</h1><span>Pagamento processado no ambiente protegido do Mercado Pago.</span></section>
      <section className="m-section"><div className="m-row-title"><h2>Suas fotos</h2><strong>{pricing ? money(pricing.total) : 'Calculando...'}</strong></div><div className="m-cart-list">{fotos.map((photo) => <div key={photo.id}><img src={photo.url} alt="" /><div><strong>{photo.event}</strong><span>{money(photo.price)}</span></div><button onClick={() => removeFoto(photo.id)}>Remover</button></div>)}</div></section>
      <section className="m-section"><h2>Identificação</h2><label>Nome completo<input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} /></label><label>E-mail<input type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} /></label><label>WhatsApp<input inputMode="numeric" value={buyer.whatsapp} onChange={(e) => setBuyer({ ...buyer, whatsapp: e.target.value.replace(/\D/g, '') })} /></label></section>
      <section className="m-section"><h2>Pagamento</h2><button className={method === 'pix' ? 'm-pay active' : 'm-pay'} onClick={() => setMethod('pix')}><Icon name="check" /> Pix <span>Confirmação rápida</span></button><button className={method === 'credit_card' ? 'm-pay active' : 'm-pay'} onClick={() => setMethod('credit_card')}><Icon name="card" /> Cartão de crédito <span>Crédito em 1x</span></button>{error && <p className="m-error">{error}</p>}<button className="m-primary block" disabled={!pricing || loading} onClick={pay}>{loading ? 'Abrindo Mercado Pago...' : 'Pagar no Mercado Pago'}</button></section>
    </main>
  );
}

function MobilePaymentReturn() {
  const { resultado } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const pedidoId = params.get('pedidoId') || params.get('external_reference');
  useEffect(() => { if (pedidoId) statusPagamento(pedidoId).then(setOrder).catch(() => setOrder(null)); }, [pedidoId]);
  const approved = resultado === 'sucesso' || order?.status === 'Pagamento Confirmado';
  return <main className="m-screen"><section className="m-callout success"><Icon name={approved ? 'check' : 'calendar'} className="m-icon big" /><h1>{approved ? 'Pagamento recebido' : 'Estamos acompanhando seu pagamento'}</h1><p>{approved ? 'Os links seguros serão enviados ao e-mail informado.' : 'Assim que o Mercado Pago confirmar, a entrega será liberada.'}</p><Link className="m-primary block" to="/buscar">Voltar aos eventos</Link></section></main>;
}

function SkeletonList() {
  return <div className="m-card-list">{[1, 2, 3].map((item) => <div className="m-skeleton" key={item} />)}</div>;
}

function EmptyState({ text }) {
  return <div className="m-empty"><Icon name="search" className="m-icon big" /><p>{text}</p></div>;
}
