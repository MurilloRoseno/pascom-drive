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
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container flex items-center justify-between py-3">
        <a href="/" className="flex-shrink-0">
          <img
            src="/assets/logo-header.png"
            alt="Paróquia São Rafael"
            className="h-14 w-auto"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-base ${
                active === link.id
                  ? 'text-photo-primary bg-photo-primary-light'
                  : 'text-gray-600 hover:text-photo-primary hover:bg-photo-primary-light'
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/galeria"
            className="btn btn-primary ml-2 text-sm"
          >
            Ver Fotos
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-gray-600 hover:text-photo-primary"
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
        <div className="md:hidden border-t border-photo-primary-light bg-white px-4 pb-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="block py-2 text-sm font-medium text-gray-600 hover:text-photo-primary"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a href="/galeria" className="btn btn-primary w-full mt-3 text-sm justify-center">
            Ver Fotos
          </a>
        </div>
      )}
    </header>
  );
}
