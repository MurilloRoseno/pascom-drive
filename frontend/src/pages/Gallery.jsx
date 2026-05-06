import Gallery from '../components/Gallery.jsx';
import CartSummary from '../components/CartSummary.jsx';

export default function GalleryPage() {
  return (
    <main className="container section-spacing">
      <h1 className="h1 text-photo-ink mb-2">Galeria de Fotos</h1>
      <p className="body text-gray-600 mb-8">Selecione as fotos que deseja adquirir.</p>
      <Gallery />
      <div className="mt-8">
        <CartSummary />
      </div>
    </main>
  );
}
