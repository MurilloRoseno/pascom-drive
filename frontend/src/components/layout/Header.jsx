import { useCarrinho } from '../../hooks/useCarrinho.js';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { fotos } = useCarrinho();
  const navigate = useNavigate();
  const count = fotos.length;

  return (
    <header
      className="sticky top-0 z-50 shadow-md"
      style={{ background: 'var(--photo-primary-dark)' }}
    >
      <div className="container flex items-center justify-between py-3">

        {/* Brand */}
        <a href="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
          <img
            src="/assets/logo-header.png"
            alt="Paróquia São Rafael"
            className="h-10 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="hidden sm:block">
            <div
              className="font-display text-sm font-semibold leading-tight"
              style={{ color: 'var(--photo-bone)' }}
            >
              Paróquia São Rafael
            </div>
            <div
              className="font-mono text-[0.5rem] tracking-widest uppercase"
              style={{ color: 'var(--photo-accent)' }}
            >
              Açailândia · MA
            </div>
          </div>
        </a>

        {/* Cart button */}
        <button
          aria-label={`Carrinho, ${count} item${count !== 1 ? 's' : ''}`}
          onClick={() => count > 0 && navigate('/checkout')}
          className="relative p-2 rounded-lg transition-colors"
          style={{
            color: count > 0 ? 'var(--photo-accent)' : 'rgba(244,237,224,0.5)',
            cursor: count > 0 ? 'pointer' : 'default',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h11M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z"
            />
          </svg>

          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[0.6rem]"
              style={{
                background: 'var(--photo-accent)',
                color: 'var(--photo-primary-dark)',
              }}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
