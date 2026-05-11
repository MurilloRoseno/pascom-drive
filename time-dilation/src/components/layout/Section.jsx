export default function Section({ title, children, id }) {
  return (
    <section id={id} className="max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32 scroll-mt-20">
      {title && (
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-text mb-16">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
