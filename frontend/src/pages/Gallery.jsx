import Gallery from '../components/Gallery.jsx';

export default function GalleryPage() {
  return (
    <main className="bg-photo-paper min-h-screen">
      <section className="py-6 md:py-10">
        <div className="container">
          <Gallery />
        </div>
      </section>
    </main>
  );
}
