/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext.jsx';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { cotarCheckout, criarPagamento, listarEventos, listarFotosEvento, obterEvento, statusPagamento, validarAcessoGaleria } from '../lib/api.js';
import { checkoutSchema } from '../lib/validation.js';
import { galleryToken, saveGalleryToken } from '../shared/gallery.js';
import { I } from './referenceIcons.jsx';
import { shadeColor, toReferenceEvent, toReferencePhoto } from './referenceUtils.jsx';
import { CalendarioScreen, EmptyCard, EventoScreen, GaleriasScreen, HomeScreen, PerfilScreen } from './referencePublicScreens.jsx';
import { CarrinhoScreen, CartBar, CheckoutScreen, FotoLightboxScreen, GaleriaFotosScreen, PaymentReturnScreen } from './referenceFlowScreens.jsx';
import './reference-tokens.css';
import './reference-layout.css';
import './reference-adapter.css';

const TWEAK_DEFAULTS = { gridCols: 3, dark: false, ornaments: true, role: 'publico', accent: '#F7C848' };

function useEventosCatalog() {
  const [state, setState] = useState({ loading: true, eventos: [], error: '' });
  useEffect(() => {
    let alive = true;
    listarEventos()
      .then(({ eventos }) => alive && setState({ loading: false, eventos: eventos.map(toReferenceEvent), error: '' }))
      .catch((error) => alive && setState({ loading: false, eventos: [], error: error.message }));
    return () => { alive = false; };
  }, []);
  return state;
}

function useEventGallery(eventoId, catalogEvent) {
  const [state, setState] = useState({ event: catalogEvent || null, photos: [], loading: true, locked: false, error: '' });
  const loadPhotos = useCallback(async (event) => {
    if (!event) return;
    if (event.visibility === 'protegida' && !galleryToken(event.id)) {
      setState({ event, photos: [], loading: false, locked: true, error: '' });
      return;
    }
    const result = await listarFotosEvento(event.id, galleryToken(event.id));
    const referenceEvent = toReferenceEvent({ ...event, ...result.event });
    setState({ event: referenceEvent, photos: result.photos.map((photo, index) => toReferencePhoto(photo, referenceEvent, index)), loading: false, locked: false, error: '' });
  }, []);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, event: catalogEvent || current.event, loading: true, error: '' }));
    obterEvento(eventoId)
      .then(({ event }) => alive && loadPhotos(toReferenceEvent(event)))
      .catch((error) => alive && setState({ event: catalogEvent || null, photos: [], loading: false, locked: false, error: error.message }));
    return () => { alive = false; };
  }, [eventoId, catalogEvent, loadPhotos]);

  return { ...state, reload: loadPhotos };
}

function MobileRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const catalog = useEventosCatalog();
  const { fotos, addFoto, removeFoto, clearCarrinho } = useCarrinho();
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [cartOpen, setCartOpen] = useState(false);

  const setTweak = (key, value) => setTweaks((current) => ({ ...current, [key]: value }));
  const cart = fotos.map((foto) => ({ ...foto, photoId: foto.id || foto.photoId }));
  const go = useCallback((next) => {
    if (next.name === 'home') navigate('/');
    if (next.name === 'galerias') navigate(`/buscar${next.sacramento && next.sacramento !== 'todos' ? `?categoria=${next.sacramento}` : ''}`);
    if (next.name === 'calendario') navigate('/calendario');
    if (next.name === 'perfil') navigate('/perfil');
    if (next.name === 'evento') navigate(`/evento/${encodeURIComponent(next.eventoId)}`);
    if (next.name === 'galeria') navigate(`/evento/${encodeURIComponent(next.eventoId)}?view=galeria`);
    if (next.name === 'foto') navigate(`/evento/${encodeURIComponent(next.eventoId)}?view=foto&idx=${next.photoIdx}`);
    if (next.name === 'checkout') navigate('/checkout');
  }, [navigate]);

  const appStyle = { '--accent': tweaks.accent, '--accent-d': shadeColor(tweaks.accent, -25) };
  const routeName = routeNameFromLocation(location);
  const isLightbox = routeName === 'foto';
  const hideChrome = isLightbox || routeName === 'checkout' || location.pathname.startsWith('/pagamento/');
  const showCartBar = cart.length > 0 && !hideChrome && !cartOpen;

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [location.pathname, location.search]);

  return (
    <div className={`app ${tweaks.dark ? 'dark' : ''} ${!tweaks.ornaments ? 'hide-ornaments' : ''}`} style={appStyle}>
      {!hideChrome && <AppBar routeName={routeName} canBack={location.pathname !== '/'} goBack={() => navigate(-1)} cartCount={cart.length} openCart={() => setCartOpen(true)} tweaks={tweaks} setTweak={setTweak} />}
      <Routes>
        <Route path="/" element={<HomeScreen go={go} eventos={catalog.eventos} loading={catalog.loading} tweaks={tweaks} />} />
        <Route path="/buscar" element={<GaleriasRoute go={go} catalog={catalog} />} />
        <Route path="/categoria" element={<Navigate replace to={`/buscar${location.search}`} />} />
        <Route path="/calendario" element={<CalendarioScreen eventos={catalog.eventos} go={go} />} />
        <Route path="/perfil" element={<PerfilScreen setRole={(role) => setTweak('role', role)} />} />
        <Route path="/evento/:eventoId" element={<EventRoute go={go} catalog={catalog} cart={cart} addFoto={addFoto} removeFoto={removeFoto} gridCols={tweaks.gridCols} tweaks={tweaks} />} />
        <Route path="/checkout" element={<CheckoutRoute cart={cart} removeFoto={removeFoto} go={go} clearCarrinho={clearCarrinho} />} />
        <Route path="/pagamento/:resultado" element={<PaymentRoute go={go} />} />
      </Routes>
      {showCartBar && <CartBar cart={cart} onClick={() => setCartOpen(true)} />}
      {cartOpen && <CarrinhoScreen cart={cart} removeFromCart={removeFoto} go={go} close={() => setCartOpen(false)} />}
      {!hideChrome && <BottomNav routeName={routeName} go={go} role={tweaks.role} />}
    </div>
  );
}

export default function MobileApp() {
  return <BrowserRouter><CarrinhoProvider><MobileRoutes /></CarrinhoProvider></BrowserRouter>;
}

function GaleriasRoute({ go, catalog }) {
  const [params] = useSearchParams();
  return <GaleriasScreen go={go} eventos={catalog.eventos} loading={catalog.loading} initialSacramento={params.get('categoria') || 'todos'} />;
}

function EventRoute({ go, catalog, cart, addFoto, removeFoto, gridCols, tweaks }) {
  const { eventoId } = useParams();
  const [params] = useSearchParams();
  const catalogEvent = catalog.eventos.find((event) => event.id === eventoId);
  const gallery = useEventGallery(eventoId, catalogEvent);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');
  const view = params.get('view');
  const idx = Number(params.get('idx') || 0);
  const addToCart = (photo) => addFoto({ ...photo, id: photo.photoId, url: photo.src, event: photo.eventoTitulo, eventoId: gallery.event?.id });
  const unlock = async (event) => {
    event.preventDefault();
    try {
      const result = await validarAcessoGaleria(eventoId, accessCode);
      saveGalleryToken(eventoId, result.token);
      setAccessError('');
      await gallery.reload(gallery.event);
    } catch (error) {
      setAccessError(error.message);
    }
  };

  if (gallery.error && !gallery.event) return <EmptyCard text={gallery.error} />;
  if (view === 'foto') return <FotoLightboxScreen ev={gallery.event} photos={gallery.photos} idx={idx} go={go} cart={cart} addToCart={addToCart} removeFromCart={removeFoto} />;
  if (view === 'galeria') return <GaleriaFotosScreen ev={gallery.event} photos={gallery.photos} loading={gallery.loading} locked={gallery.locked} accessCode={accessCode} setAccessCode={setAccessCode} accessError={accessError || gallery.error} unlock={unlock} go={go} cart={cart} addToCart={addToCart} removeFromCart={removeFoto} gridCols={gridCols} />;
  return <EventoScreen ev={gallery.event || catalogEvent} go={go} tweaks={tweaks} />;
}

function CheckoutRoute({ cart, removeFoto, go, clearCarrinho }) {
  const [buyer, setBuyer] = useState({ name: '', email: '', whatsapp: '' });
  const [method, setMethod] = useState('pix');
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const galleryTokens = useMemo(() => Object.fromEntries([...new Set(cart.map((photo) => photo.eventoId))].map((id) => [id, galleryToken(id)])), [cart]);

  useEffect(() => {
    if (!cart.length) return;
    cotarCheckout({ fotoIds: cart.map((photo) => photo.photoId), paymentMethod: method, galleryTokens })
      .then(({ pricing }) => { setPricing(pricing); setError(''); })
      .catch((error) => setError(error.message));
  }, [cart, method, galleryTokens]);

  async function pay() {
    const valid = checkoutSchema.safeParse(buyer);
    if (!valid.success) { setError(valid.error.errors[0].message); return; }
    setLoading(true);
    try {
      const response = await criarPagamento({ ...buyer, fotoIds: cart.map((photo) => photo.photoId), paymentMethod: method, galleryTokens });
      clearCarrinho();
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (!cart.length) return <EmptyCard text="Seu carrinho está vazio." />;
  return <CheckoutScreen cart={cart} pricing={pricing} buyer={buyer} setBuyer={setBuyer} method={method} setMethod={setMethod} error={error} loading={loading} removeFromCart={removeFoto} go={go} pay={pay} />;
}

function PaymentRoute({ go }) {
  const { resultado } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const pedidoId = params.get('pedidoId') || params.get('external_reference');
  useEffect(() => { if (pedidoId) statusPagamento(pedidoId).then(setOrder).catch(() => setOrder(null)); }, [pedidoId]);
  const approved = resultado === 'sucesso' || order?.status === 'Pagamento Confirmado';
  return <PaymentReturnScreen approved={approved} order={order} go={go} />;
}

function AppBar({ routeName, canBack, goBack, cartCount, openCart, tweaks, setTweak }) {
  const title = { home: 'Início', galerias: 'Galerias', calendario: 'Calendário', perfil: tweaks.role === 'pascom' ? 'Pascom' : 'Perfil', evento: 'Evento', galeria: 'Galeria' }[routeName] || '';
  return <header className="appbar"><div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>{canBack ? <button className="appbar-back" onClick={goBack}><I.ChevronLeft className="icon" /></button> : <img src="/assets/logo-header.png" alt="Paróquia São Rafael" style={{ height: 36, width: 'auto', marginRight: 4 }} />}<div style={{ minWidth: 0 }}>{canBack ? <><div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{routeName === 'galeria' ? 'Fotos do evento' : ''}</div><div className="appbar-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{title}</div></> : <><div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-d)' }}>Paróquia</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--brand)', lineHeight: 1.1 }}>São Rafael</div></>}</div></div><div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><button className="appbar-icon-btn" onClick={() => setTweak('dark', !tweaks.dark)}>{tweaks.dark ? <I.Sun className="icon" /> : <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}</button><button className="appbar-icon-btn" onClick={openCart}><I.Bag className="icon" />{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}</button></div></header>;
}

function BottomNav({ routeName, go, role }) {
  const items = [{ id: 'home', label: 'Início', icon: I.Home }, { id: 'galerias', label: 'Galerias', icon: I.Camera }, { id: 'calendario', label: 'Calendário', icon: I.Calendar }, { id: 'perfil', label: role === 'pascom' ? 'Pascom' : 'Perfil', icon: role === 'pascom' ? I.Upload : I.User }];
  return <nav className="botnav">{items.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => go({ name: item.id })} className={`botnav-item${routeName === item.id ? ' active' : ''}`}><Icon className="icon" /><span>{item.label}</span></button>; })}</nav>;
}

function routeNameFromLocation(location) {
  if (location.pathname === '/') return 'home';
  if (location.pathname === '/buscar') return 'galerias';
  if (location.pathname === '/calendario') return 'calendario';
  if (location.pathname === '/perfil') return 'perfil';
  if (location.pathname === '/checkout') return 'checkout';
  if (location.pathname.startsWith('/pagamento/')) return 'pagamento';
  if (location.search.includes('view=foto')) return 'foto';
  if (location.search.includes('view=galeria')) return 'galeria';
  if (location.pathname.startsWith('/evento/')) return 'evento';
  return 'home';
}
