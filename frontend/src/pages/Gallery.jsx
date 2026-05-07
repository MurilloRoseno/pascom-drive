import Gallery from '../components/Gallery.jsx';
import CartSummary from '../components/CartSummary.jsx';

const ORNAMENT_STAR = (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, flexShrink: 0 }}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function GalleryPage() {
  return (
    <main className="bg-photo-paper min-h-screen">
      <section className="py-12">
        <div className="container">
          <div className="text-center mb-10">
            <div className="eyebrow">Galeria</div>
            <h1 className="font-display text-4xl mt-2" style={{ color: 'var(--photo-primary)' }}>
              Fotos do Evento
            </h1>
            <div className="divider-ornament" style={{ maxWidth: 280, margin: '1rem auto' }}>
              {ORNAMENT_STAR}
            </div>
            <p className="body max-w-xl mx-auto">
              Selecione as fotos que deseja adquirir para revelação.
            </p>
          </div>

          <Gallery />

          <div className="mt-10">
            <CartSummary />
          </div>
        </div>
      </section>
    </main>
  );
}
