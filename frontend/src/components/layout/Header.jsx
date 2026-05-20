import { useCarrinho } from '../../hooks/useCarrinho.js';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { fotos } = useCarrinho();
  const navigate = useNavigate();
  const qtd = fotos.length;

  return (
    <header
      className="sticky top-0 z-50 shadow-md"
      style={{ background: 'var(--photo-primary)' }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-3">

        {/* Logo + Nome */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-left"
          style={{ background: 'none', border: 'none', cursor: 'pointer', minHeight: 'var(--touch-md)', padding: 0 }}
          aria-label="Ir para a galeria"
        >
          <img
            src="/assets/logo-white.png"
            alt="Paróquia São Rafael"
            className="h-10 w-10 object-contain flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="hidden sm:block">
            <p className="text-white font-bold leading-tight"
               style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)' }}>
              Paróquia São Rafael
            </p>
            <p style={{ color: 'var(--photo-bone)', fontSize: 'var(--text-xs)' }}>
              Açailândia · MA
            </p>
          </div>
        </button>

        {/* Título central (mobile only) */}
        <p className="sm:hidden text-white font-semibold text-center flex-1"
           style={{ fontSize: 'var(--text-sm)' }}>
          Fotos do Evento
        </p>

        {/* Botão Carrinho */}
        <button
          onClick={() => qtd > 0 && navigate('/checkout')}
          disabled={qtd === 0}
          aria-label={`Carrinho com ${qtd} foto${qtd !== 1 ? 's' : ''}`}
          className="flex items-center gap-2 rounded-lg px-3 font-semibold transition-all"
          style={{
            background: qtd > 0 ? 'var(--photo-accent)' : 'rgba(255,255,255,0.15)',
            color: qtd > 0 ? 'var(--photo-ink)' : 'rgba(255,255,255,0.45)',
            minHeight: 'var(--touch-md)',
            fontSize: 'var(--text-sm)',
            cursor: qtd > 0 ? 'pointer' : 'default',
            border: 'none',
            flexShrink: 0,
          }}
        >
          {/* Ícone carrinho */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="hidden sm:inline">Carrinho</span>
          {qtd > 0 && (
            <span
              className="rounded-full font-bold text-white"
              style={{
                background: 'var(--photo-primary)',
                fontSize: 'var(--text-xs)',
                minWidth: '24px',
                height: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px',
              }}
            >
              {qtd > 9 ? '9+' : qtd}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
