import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CarrinhoProvider } from './context/CarrinhoContext.jsx';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import CartSummary from './components/CartSummary.jsx';
import SearchPage from './pages/Search.jsx';
import EventPage from './pages/Event.jsx';
import CheckoutPage from './pages/Checkout.jsx';
import PaymentReturnPage from './pages/PaymentReturn.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <CarrinhoProvider>
        <div className="parish-app">
          <Header />
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/buscar" element={<SearchPage />} />
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
