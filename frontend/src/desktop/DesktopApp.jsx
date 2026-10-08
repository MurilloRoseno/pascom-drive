import { BrowserRouter, Link, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext.jsx';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import ScrollToTop from '../components/layout/ScrollToTop.jsx';
import CartSummary from '../components/CartSummary.jsx';
import HomePage from '../pages/Home.jsx';
import SearchPage from '../pages/Search.jsx';
import EventPage from '../pages/Event.jsx';
import CheckoutPage from '../pages/Checkout.jsx';
import PaymentReturnPage from '../pages/PaymentReturn.jsx';
import PrivacyPolicy from '../pages/PrivacyPolicy.jsx';
import RecoverOrderPage from '../pages/RecoverOrder.jsx';
import EventSlugRedirect from '../shared/EventSlugRedirect.jsx';
import '../index.css';
import '../reference-pages.css';
import '../home-reference.css';

function LegacyCategoryRedirect() {
  const { search } = useLocation();
  return <Navigate replace to={`/buscar${search}`} />;
}

// Endereco desconhecido. As rotas de evento e checkout ficam no segundo bloco de rotas.
function NotFound() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/evento/') || pathname === '/checkout') return null;
  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <p className="hero-kicker">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter mudado ou sido digitado errado. <Link to="/">Voltar ao início</Link> ou <Link to="/buscar">ver as galerias</Link>.</p>
      </div>
    </main>
  );
}

export default function DesktopApp() {
  return (
    <BrowserRouter>
      <div className="parish-app">
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/buscar" element={<SearchPage />} />
          <Route path="/categoria" element={<LegacyCategoryRedirect />} />
          <Route path="/e/:slug" element={<EventSlugRedirect />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route path="/recuperar-pedido" element={<RecoverOrderPage />} />
          <Route path="/pagamento/:resultado" element={<PaymentReturnPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CarrinhoProvider>
          <Routes>
            <Route path="/evento/:eventoId" element={<EventPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
          <CartSummary />
        </CarrinhoProvider>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
