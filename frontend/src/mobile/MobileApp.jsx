/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext.jsx';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { cotarCheckout, criarPagamento, listarEventos, listarFotosEvento, listarOfertasEvento, obterEvento, recuperarPedido, statusPagamento, validarAcessoGaleria } from '../lib/api.js';
import { checkoutSchema } from '../lib/validation.js';
import PrivacyPolicy from '../pages/PrivacyPolicy.jsx';
import AjudaPage from '../pages/Ajuda.jsx';
import AgendaPage from '../pages/Agenda.jsx';
import AssistenteFlutuante from '../components/AssistenteFlutuante.jsx';
import ModuloGuard from '../components/ModuloGuard.jsx';
import { moduloLigado, useSite } from '../shared/site.js';
import { useDevtoolsGuard } from '../shared/devtoolsGuard.js';
import { buildEventSharePayload, shareEventNatively } from '../shared/eventShare.js';
import EventSlugRedirect from '../shared/EventSlugRedirect.jsx';
import { galleryToken, saveGalleryToken } from '../shared/gallery.js';
import { I } from './referenceIcons.jsx';
import { shadeColor, toReferenceEvent, toReferencePhoto } from './referenceUtils.jsx';
import { CalendarioScreen, EmptyCard, EventoScreen, GaleriasScreen, HomeScreen, PerfilScreen } from './referencePublicScreens.jsx';
import { CarrinhoScreen, CartBar, CheckoutScreen, FotoLightboxScreen, GaleriaFotosScreen, PaymentReturnScreen } from './referenceFlowScreens.jsx';
import './reference-tokens.css';
import './reference-layout.css';
import './reference-gallery-calendar.css';
import './reference-adapter.css';

const TWEAK_DEFAULTS = { gridCols: 3, dark: false, ornaments: true, role: 'publico', accent: '#F7C848' };

function useEventosCatalog(enabled = true) {
  const [state, setState] = useState({ loading: enabled, eventos: [], error: '' });
  useEffect(() => {
    if (!enabled) {
      setState((current) => current.loading ? { ...current, loading: false } : current);
      return undefined;
    }
    let alive = true;
    listarEventos()
      .then(({ eventos }) => alive && setState({ loading: false, eventos: eventos.map(toReferenceEvent), error: '' }))
      .catch((error) => alive && setState({ loading: false, eventos: [], error: error.message }));
    return () => { alive = false; };
  }, [enabled]);
  return state;
}

function useEventGallery(eventoId, catalogEvent, preco) {
  const [state, setState] = useState({ event: catalogEvent || null, photos: [], loading: true, locked: false, error: '' });
  const loadPhotos = useCallback(async (event) => {
    if (!event) return;
    if (event.visibility === 'protegida' && !galleryToken(event.id)) {
      setState({ event, photos: [], loading: false, locked: true, error: '' });
      return;
    }
    const result = await listarFotosEvento(event.id, galleryToken(event.id));
    const referenceEvent = toReferenceEvent({ ...event, ...result.event });
    // o preço mostrado é o que o servidor cobra (aba Configuracoes), não o da linha da planilha
    setState({ event: referenceEvent, photos: result.photos.map((photo, index) => toReferencePhoto({ ...photo, price: preco }, referenceEvent, index)), loading: false, locked: false, error: '' });
  }, [preco]);

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
  const routeName = routeNameFromLocation(location);
  const shouldLoadCatalog = ['home', 'galerias', 'calendario', 'evento', 'galeria', 'foto'].includes(routeName);
  const catalog = useEventosCatalog(shouldLoadCatalog);
  const site = useSite();
  const { fotos, couponCode, packageId, addFoto, addFotos, removeFoto, clearCarrinho, setCouponCode, setPackageId } = useCarrinho();
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [cartOpen, setCartOpen] = useState(false);

  const setTweak = (key, value) => setTweaks((current) => ({ ...current, [key]: value }));
  const cart = fotos.map((foto) => ({ ...foto, photoId: foto.id || foto.photoId, price: site.precos.foto }));
  const vendaNoAr = moduloLigado(site, 'checkout');
  const go = useCallback((next) => {
    if (next.name === 'home') navigate('/');
    if (next.name === 'galerias') navigate(`/buscar${next.sacramento && next.sacramento !== 'todos' ? `?categoria=${next.sacramento}` : ''}`);
    if (next.name === 'calendario') navigate('/calendario');
    if (next.name === 'agenda') navigate('/agenda');
    if (next.name === 'ajuda') navigate('/ajuda');
    if (next.name === 'perfil') navigate('/perfil');
    if (next.name === 'privacidade') navigate('/privacidade');
    if (next.name === 'evento') navigate(`/evento/${encodeURIComponent(next.eventoId)}`);
    if (next.name === 'galeria') navigate(`/evento/${encodeURIComponent(next.eventoId)}?view=galeria`);
    if (next.name === 'foto') navigate(`/evento/${encodeURIComponent(next.eventoId)}?view=foto&idx=${next.photoIdx}`);
    if (next.name === 'checkout') navigate('/checkout');
  }, [navigate]);

  const appStyle = { '--accent': tweaks.accent, '--accent-d': shadeColor(tweaks.accent, -25) };
  const isLightbox = routeName === 'foto';
  const hideChrome = isLightbox || routeName === 'checkout' || location.pathname.startsWith('/pagamento/');
  const showCartBar = vendaNoAr && cart.length > 0 && !hideChrome && !cartOpen;

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [location.pathname, location.search]);

  return (
    <div className={`app ${tweaks.dark ? 'dark' : ''} ${!tweaks.ornaments ? 'hide-ornaments' : ''}`} style={appStyle}>
      {!hideChrome && <AppBar cartCount={cart.length} openCart={() => setCartOpen(true)} tweaks={tweaks} setTweak={setTweak} site={site} vendaNoAr={vendaNoAr} />}
      <Routes>
        <Route path="/" element={<HomeScreen go={go} eventos={catalog.eventos} loading={catalog.loading} tweaks={tweaks} />} />
        <Route path="/buscar" element={<ModuloGuard chave="busca"><GaleriasRoute go={go} catalog={catalog} /></ModuloGuard>} />
        <Route path="/categoria" element={<Navigate replace to={`/buscar${location.search}`} />} />
        <Route path="/e/:slug" element={<EventSlugRedirect />} />
        <Route path="/calendario" element={<ModuloGuard chave="busca"><CalendarioScreen eventos={catalog.eventos} go={go} /></ModuloGuard>} />
        <Route path="/agenda" element={<ModuloGuard chave="agenda"><AgendaPage mobile /></ModuloGuard>} />
        <Route path="/ajuda" element={<ModuloGuard chave="ajuda"><AjudaPage mobile /></ModuloGuard>} />
        <Route path="/perfil" element={<PerfilScreen setRole={(role) => setTweak('role', role)} go={go} role={tweaks.role} eventos={catalog.eventos} recuperarPedido={recuperarPedido} />} />
        <Route path="/privacidade" element={<PrivacyPolicy mobile />} />
        <Route path="/politica-de-privacidade" element={<PrivacyPolicy mobile />} />
        <Route path="/evento/:eventoId" element={<ModuloGuard chave="busca"><EventRoute go={go} catalog={catalog} cart={cart} addFoto={addFoto} addFotos={addFotos} removeFoto={removeFoto} setPackageId={setPackageId} gridCols={tweaks.gridCols} setGridCols={(value) => setTweak('gridCols', value)} tweaks={tweaks} /></ModuloGuard>} />
        <Route path="/checkout" element={<ModuloGuard chave="checkout"><CheckoutRoute cart={cart} couponCode={couponCode} packageId={packageId} setCouponCode={setCouponCode} removeFoto={removeFoto} go={go} clearCarrinho={clearCarrinho} /></ModuloGuard>} />
        <Route path="/pagamento/:resultado" element={<PaymentRoute go={go} />} />
      </Routes>
      {showCartBar && <CartBar cart={cart} onClick={() => setCartOpen(true)} />}
      {vendaNoAr && cartOpen && <CarrinhoScreen cart={cart} removeFromCart={removeFoto} go={go} close={() => setCartOpen(false)} />}
      {!hideChrome && <AssistenteFlutuante mobile acima={showCartBar} />}
      {!hideChrome && <BottomNav routeName={routeName} go={go} role={tweaks.role} site={site} />}
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

function EventRoute({ go, catalog, cart, addFoto, addFotos, removeFoto, setPackageId, gridCols, setGridCols, tweaks }) {
  const { eventoId } = useParams();
  const [params] = useSearchParams();
  const catalogEvent = catalog.eventos.find((event) => event.id === eventoId);
  const site = useSite();
  const gallery = useEventGallery(eventoId, catalogEvent, site.precos.foto);
  const [offers, setOffers] = useState({ coupons: [], packages: [] });
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');
  const { isDevtoolsOpen } = useDevtoolsGuard({ enabled: Boolean(gallery.event && !gallery.locked) });
  const view = params.get('view');
  const idx = Number(params.get('idx') || 0);
  const addToCart = (photo) => addFoto({ ...photo, id: photo.photoId, url: photo.src, event: photo.eventoTitulo, eventoId: gallery.event?.id });
  const addManyToCart = (photos) => addFotos(photos.map((photo) => ({ ...photo, id: photo.photoId, url: photo.src, event: photo.eventoTitulo, eventoId: gallery.event?.id })));
  const selectPackage = (pkg) => {
    setPackageId(pkg.id);
    if (pkg.type === 'all_event_photos') addManyToCart(gallery.photos);
  };
  const shareEvent = async () => {
    const payload = buildEventSharePayload(gallery.event || catalogEvent || { id: eventoId }, window.location.origin);
    await shareEventNatively(payload, navigator);
  };
  useEffect(() => {
    listarOfertasEvento(eventoId).then(({ offers: found }) => setOffers(found)).catch(() => setOffers({ coupons: [], packages: [] }));
  }, [eventoId]);
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
  if (view === 'foto') return <FotoLightboxScreen ev={gallery.event} photos={gallery.photos} idx={idx} go={go} cart={cart} addToCart={addToCart} removeFromCart={removeFoto} isDevtoolsOpen={isDevtoolsOpen} />;
  if (view === 'galeria') return <GaleriaFotosScreen ev={gallery.event} photos={gallery.photos} loading={gallery.loading} locked={gallery.locked} accessCode={accessCode} setAccessCode={setAccessCode} accessError={accessError || gallery.error} unlock={unlock} go={go} cart={cart} addToCart={addToCart} removeFromCart={removeFoto} gridCols={gridCols} setGridCols={setGridCols} offers={offers} selectPackage={selectPackage} shareEvent={shareEvent} isDevtoolsOpen={isDevtoolsOpen} />;
  return <EventoScreen ev={gallery.event || catalogEvent} photos={gallery.photos} loading={gallery.loading} locked={gallery.locked} go={go} tweaks={tweaks} cart={cart} addToCart={addToCart} removeFromCart={removeFoto} offers={offers} selectPackage={selectPackage} shareEvent={shareEvent} isDevtoolsOpen={isDevtoolsOpen} />;
}

function CheckoutRoute({ cart, couponCode, packageId, setCouponCode, removeFoto, go, clearCarrinho }) {
  const [buyer, setBuyer] = useState({ name: '', email: '', whatsapp: '' });
  const [method, setMethod] = useState('pix');
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const galleryTokens = useMemo(() => Object.fromEntries([...new Set(cart.map((photo) => photo.eventoId))].map((id) => [id, galleryToken(id)])), [cart]);

  useEffect(() => {
    if (!cart.length) return;
    cotarCheckout({ fotoIds: cart.map((photo) => photo.photoId), paymentMethod: method, galleryTokens, couponCode, packageId })
      .then(({ pricing }) => { setPricing(pricing); setError(''); })
      .catch((error) => setError(error.message));
  }, [cart, method, galleryTokens, couponCode, packageId]);

  async function pay() {
    const valid = checkoutSchema.safeParse(buyer);
    if (!valid.success) { setError(valid.error.errors[0].message); return; }
    setLoading(true);
    try {
      const response = await criarPagamento({ ...buyer, fotoIds: cart.map((photo) => photo.photoId), paymentMethod: method, galleryTokens, couponCode, packageId });
      clearCarrinho();
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (!cart.length) return <EmptyCard text="Seu carrinho está vazio." />;
  return <CheckoutScreen cart={cart} pricing={pricing} buyer={buyer} setBuyer={setBuyer} method={method} setMethod={setMethod} couponCode={couponCode} setCouponCode={setCouponCode} error={error} loading={loading} removeFromCart={removeFoto} go={go} pay={pay} />;
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

function AppBar({ cartCount, openCart, tweaks, setTweak, site, vendaNoAr }) {
  // "Paróquia São Rafael" vira duas linhas: a primeira palavra em cima, o resto embaixo
  const [primeira, ...resto] = site.nome.split(' ');
  return <header className="appbar"><div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}><img src="/assets/logo-header.png" alt={site.nome} style={{ height: 40, width: 'auto', display: 'block', flexShrink: 0 }} /><div style={{ minWidth: 0, lineHeight: 1 }}><div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-d)', whiteSpace: 'nowrap' }}>{primeira}</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)', lineHeight: 1.1, marginTop: 3, whiteSpace: 'nowrap' }}>{resto.join(' ')}</div></div></div><div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><button className="appbar-icon-btn" onClick={() => setTweak('dark', !tweaks.dark)} title="Tema">{tweaks.dark ? <I.Sun className="icon" /> : <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}</button>{vendaNoAr && <button className="appbar-icon-btn" onClick={openCart} title="Carrinho"><I.Bag className="icon" />{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}</button>}</div></header>;
}

function BottomNav({ routeName, go, role, site }) {
  const busca = moduloLigado(site, 'busca');
  const agenda = moduloLigado(site, 'agenda');
  const items = [
    { id: 'home', label: 'Início', icon: I.Home },
    ...(busca ? [{ id: 'galerias', label: 'Galerias', icon: I.Camera }] : []),
    ...(busca || agenda ? [{ id: busca ? 'calendario' : 'agenda', label: 'Calendário', icon: I.Calendar }] : []),
    { id: 'perfil', label: role === 'pascom' ? 'Pascom' : 'Perfil', icon: role === 'pascom' ? I.Upload : I.User },
  ];
  const ativa = (id) => routeName === id || (id === 'calendario' && routeName === 'agenda') || (id === 'perfil' && routeName === 'ajuda');
  return <nav className="botnav" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>{items.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => go({ name: item.id })} className={`botnav-item${ativa(item.id) ? ' active' : ''}`}><Icon className="icon" /><span>{item.label}</span></button>; })}</nav>;
}

function routeNameFromLocation(location) {
  if (location.pathname === '/') return 'home';
  if (location.pathname === '/buscar') return 'galerias';
  if (location.pathname === '/calendario') return 'calendario';
  if (location.pathname === '/agenda') return 'agenda';
  if (location.pathname === '/ajuda') return 'ajuda';
  if (location.pathname === '/perfil') return 'perfil';
  if (location.pathname === '/privacidade' || location.pathname === '/politica-de-privacidade') return 'privacidade';
  if (location.pathname === '/checkout') return 'checkout';
  if (location.pathname.startsWith('/pagamento/')) return 'pagamento';
  if (location.search.includes('view=foto')) return 'foto';
  if (location.search.includes('view=galeria')) return 'galeria';
  if (location.pathname.startsWith('/evento/')) return 'evento';
  return 'home';
}
