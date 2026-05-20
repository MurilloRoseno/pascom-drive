export default function Footer() {
  return (
    <footer
      className="text-center py-8 px-4"
      style={{
        background: 'var(--photo-primary-dark)',
        color: 'var(--photo-bone)',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
      }}
    >
      <img
        src="/assets/logo-white.png"
        alt="Paróquia São Rafael"
        className="mx-auto mb-3"
        style={{ height: 48, opacity: 0.85 }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <p className="font-bold" style={{ fontSize: 'var(--text-base)' }}>
        Paróquia São Rafael
      </p>
      <p style={{ fontSize: 'var(--text-sm)', opacity: 0.7, marginTop: '0.25rem' }}>
        Açailândia – MA
      </p>
      <p style={{ fontSize: 'var(--text-xs)', opacity: 0.4, marginTop: '1rem' }}>
        © {new Date().getFullYear()} Paróquia São Rafael — Açailândia/MA
      </p>
    </footer>
  );
}
