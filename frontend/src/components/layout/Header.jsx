import { useState } from 'react';

const NAV_LINKS = [
  { id: 'home', label: 'Início', href: '/' },
  { id: 'gallery', label: 'Galeria', href: '/galeria' },
  { id: 'sobre', label: 'Sobre', href: '/sobre' },
  { id: 'contato', label: 'Contato', href: '/contato' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = 'gallery';

  return (
    <header className="sticky top-0 z-50 bg-photo-primary-dark shadow-md">
      <div className="container flex items-center justify-between py-3">
        <a href="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
          <img
            src="/assets/logo-header.png"
            alt="Paróquia São Rafael"
            className="h-12 w-auto"
          />
          <div className="hidden sm:block">
            <div className="font-display text-base leading-tight" style={{ color: 'var(--photo-bone)' }}>Paróquia São Rafael</div>
            <div className="font-mono text-[0.55rem] tracking-widest uppercase" style={{ color: 'var(--photo-accent)' }}>Diocese · Imperatriz</div>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={`px-3.5 py-2 rounded-md font-mono text-[0.65rem] uppercase tracking-widest transition-colors duration-base ${
                active === link.id ? 'bg-photo-accent/10' : 'hover:bg-photo-accent/10'
              }`}
              style={{
                textDecoration: 'none',
                color: active === link.id ? 'var(--photo-accent)' : 'rgba(244,237,224,0.7)',
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/"
            className="btn btn-primary ml-3 btn-sm"
            style={{ textDecoration: 'none' }}
          >
            Ver Fotos
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md"
          style={{ color: 'rgba(244,237,224,0.7)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Abrir menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 pb-4" style={{ borderColor: 'rgba(247,200,72,0.2)', background: 'var(--photo-primary)' }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="block py-2 font-mono text-[0.65rem] uppercase tracking-widest"
              style={{ textDecoration: 'none', color: 'rgba(244,237,224,0.7)' }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a href="/" className="btn btn-primary w-full mt-3 justify-center" style={{ textDecoration: 'none' }}>
            Ver Fotos
          </a>
        </div>
      )}
    </header>
  );
}
