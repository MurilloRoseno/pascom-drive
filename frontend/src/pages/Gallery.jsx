import Gallery from '../components/Gallery.jsx';

export default function GalleryPage() {
  return (
    <main className="bg-photo-paper min-h-screen">
      {/* paddingBottom garante que o CartSummary fixo não tape as fotos */}
      <section className="py-6 md:py-10" style={{ paddingBottom: '110px' }}>
        <div className="max-w-6xl mx-auto px-4">
          <Gallery />
        </div>
      </section>
    </main>
  );
}
