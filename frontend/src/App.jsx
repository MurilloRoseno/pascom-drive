import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { CarrinhoProvider } from './context/CarrinhoContext.jsx';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import CartSummary from './components/CartSummary.jsx';
import HomePage from './pages/Home.jsx';
import SearchPage from './pages/Search.jsx';
import EventPage from './pages/Event.jsx';
import CheckoutPage from './pages/Checkout.jsx';
import PaymentReturnPage from './pages/PaymentReturn.jsx';

function LegacyCategoryRedirect() {
  const { search } = useLocation();
  return <Navigate replace to={`/buscar${search}`} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <CarrinhoProvider>
        <div className="parish-app">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="/categoria" element={<LegacyCategoryRedirect />} />
            <Route path="/evento/:eventoId" element={<EventPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pagamento/:resultado" element={<PaymentReturnPage />} />
          </Routes>
          <Footer />
          <CartSummary />
        </div>
      </CarrinhoProvider>
    </BrowserRouter>
  );
}
