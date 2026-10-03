import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
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
import PascomPage from '../pages/Pascom.jsx';
import AjudaPage from '../pages/Ajuda.jsx';
import AgendaPage from '../pages/Agenda.jsx';
import AssistenteFlutuante from '../components/AssistenteFlutuante.jsx';
import ModuloGuard from '../components/ModuloGuard.jsx';
import { moduloLigado, useSite } from '../shared/site.js';
import EventSlugRedirect from '../shared/EventSlugRedirect.jsx';
import '../index.css';
import '../reference-pages.css';
import '../home-reference.css';

function LegacyCategoryRedirect() {
  const { search } = useLocation();
  return <Navigate replace to={`/buscar${search}`} />;
}

export default function DesktopApp() {
  const site = useSite();
  return (
    <BrowserRouter>
      <div className="parish-app">
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/buscar" element={<ModuloGuard chave="busca"><SearchPage /></ModuloGuard>} />
          <Route path="/categoria" element={<LegacyCategoryRedirect />} />
          <Route path="/e/:slug" element={<EventSlugRedirect />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route path="/recuperar-pedido" element={<RecoverOrderPage />} />
          <Route path="/pascom" element={<PascomPage />} />
          <Route path="/ajuda" element={<ModuloGuard chave="ajuda"><AjudaPage /></ModuloGuard>} />
          <Route path="/agenda" element={<ModuloGuard chave="agenda"><AgendaPage /></ModuloGuard>} />
          <Route path="/pagamento/:resultado" element={<PaymentReturnPage />} />
        </Routes>
        <CarrinhoProvider>
          <Routes>
            <Route path="/evento/:eventoId" element={<ModuloGuard chave="busca"><EventPage /></ModuloGuard>} />
            <Route path="/checkout" element={<ModuloGuard chave="checkout"><CheckoutPage /></ModuloGuard>} />
          </Routes>
          {moduloLigado(site, 'checkout') && <CartSummary />}
        </CarrinhoProvider>
        <Footer />
        <AssistenteFlutuante />
      </div>
    </BrowserRouter>
  );
}
