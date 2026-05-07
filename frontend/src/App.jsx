import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CarrinhoProvider } from './context/CarrinhoContext.jsx';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import CartSummary from './components/CartSummary.jsx';
import GalleryPage from './pages/Gallery.jsx';
import CheckoutPage from './pages/Checkout.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <CarrinhoProvider>
        <div className="min-h-screen flex flex-col bg-photo-paper">
          <Header />
          <div className="flex-1 pb-20">
            <Routes>
              <Route path="/" element={<GalleryPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </div>
          <Footer />
          <CartSummary />
        </div>
      </CarrinhoProvider>
    </BrowserRouter>
  );
}
