import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePainel } from './PainelContext.jsx';
import { itemDaRota, menuVisivel } from './menuPainel.js';

const ROTULO_PAPEL = {
  admin: 'Administrador',
  coord: 'Coordenação',
  foto: 'Fotógrafo',
  atend: 'Atendimento',
};

/**
 * Moldura do painel: menu lateral no computador, gaveta no celular.
 * @param {{onSair: () => void}} props
 */
export default function PainelLayout({ onSair }) {
  const { membro } = usePainel();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);

  const itens = menuVisivel(membro.permissoes);
  const atual = itemDaRota(pathname, itens) || itens[0];

  useEffect(() => setAberto(false), [pathname]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharComEsc = (e) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [aberto]);

  return (
    <div className="min-h-screen bg-photo-paper text-photo-ink font-body lg:flex">
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-photo-primary-dark px-4 py-2 text-photo-bone">
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={aberto}
          aria-controls="menu-painel"
          onClick={() => setAberto(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl hover:bg-white/10"
        >
          ☰
        </button>
        <span className="font-display text-lg">Painel Pascom</span>
      </header>

      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        id="menu-painel"
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-photo-primary-dark text-photo-bone transition-transform duration-base lg:sticky lg:top-0 lg:h-screen lg:w-[244px] lg:shrink-0 lg:translate-x-0 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <p className="font-mono text-eyebrow uppercase tracking-widest text-photo-accent">Pascom Drive</p>
          <p className="mt-1 font-display text-xl">Painel admin</p>
          <p className="text-body-sm text-photo-bone/70">Paróquia São Rafael</p>
        </div>

        <nav aria-label="Seções do painel" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {itens.map((item, i) => (
              <li key={item.chave}>
                <NavLink
                  to={item.rota}
                  end={item.rota === '/painel'}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-body-sm font-semibold transition-colors ${
                      isActive ? 'bg-photo-accent/20 text-photo-accent' : 'text-photo-bone hover:bg-white/10'
                    }`
                  }
                >
                  <span className="font-mono text-caption opacity-60">{String(i + 1).padStart(2, '0')}</span>
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-body-sm">
          <p className="font-semibold">{membro.nome}</p>
          <p className="text-photo-bone/70">{ROTULO_PAPEL[membro.role] || membro.role}</p>
          <button
            type="button"
            onClick={onSair}
            className="mt-3 min-h-[44px] w-full rounded-lg border border-white/30 px-3 font-semibold hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-10 sm:pt-8">
        <div className="mx-auto max-w-[1200px]">
          {atual && (
            <header className="mb-8">
              <p className="font-mono text-eyebrow uppercase tracking-widest text-photo-primary">{atual.eyebrow}</p>
              <h1 className="mt-1 font-display text-h1 font-semibold text-photo-primary-dark">{atual.titulo}</h1>
              <p className="mt-1 max-w-2xl text-painel-texto2">{atual.subtitulo}</p>
            </header>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
