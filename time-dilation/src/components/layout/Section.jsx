export default function Section({ title, children, id }) {
  return (
    <section id={id} className="max-w-6xl mx-auto px-4 py-20 scroll-mt-16">
      {title && (
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-text-primary mb-12">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
