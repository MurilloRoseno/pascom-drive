import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Peças de interface compartilhadas pelas telas do painel.

export function Cartao({ titulo, descricao, children, className = '', destaque = false }) {
  return (
    <section
      className={`rounded-[14px] bg-white p-5 sm:p-6 ${
        destaque ? 'border-2 border-photo-primary' : 'border border-painel-linha'
      } ${className}`}
    >
      {titulo && (
        <h2 className="font-display text-h3 font-semibold text-photo-primary-dark">{titulo}</h2>
      )}
      {descricao && <p className="mt-1 text-body-sm text-painel-texto2">{descricao}</p>}
      <div className={titulo || descricao ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

const TONS = {
  verde: 'bg-[#D5EBDD] text-[#1F5A3B]',
  amarelo: 'bg-[#FBEBB5] text-[#5C4700]',
  laranja: 'bg-[#FAD9C7] text-[#7A2E0E]',
  cinza: 'bg-[#EEE9DF] text-[#4A443B]',
  azul: 'bg-[#DCE8F2] text-[#1F4A6B]',
  arquivado: 'bg-[#E7E2E8] text-[#4B3F4F]',
  lilas: 'bg-painel-selecionado text-photo-primary-dark',
};

export function Pilula({ tom = 'cinza', children }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 font-mono text-caption ${TONS[tom] || TONS.cinza}`}>
      {children}
    </span>
  );
}

const BOTOES = {
  primario: 'bg-photo-primary text-white hover:bg-photo-primary-dark',
  dourado: 'bg-photo-accent text-photo-ink hover:bg-[#FFDA85]',
  secundario: 'border border-photo-primary text-photo-primary hover:bg-painel-selecionado',
  perigo: 'border border-painel-perigo text-painel-perigo hover:bg-[#FAD9C7]',
};

export function Botao({ variante = 'primario', className = '', type = 'button', ...resto }) {
  return (
    <button
      type={type}
      className={`min-h-[44px] rounded-lg px-5 text-body-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BOTOES[variante]} ${className}`}
      {...resto}
    />
  );
}

/** Controle segmentado: um grupo de opções exclusivas. */
export function Segmentado({ rotulo, opcoes, valor, onChange, desabilitado = false }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={desabilitado}
            onClick={() => onChange(o.valor)}
            className={`min-h-[44px] rounded-lg border px-4 text-body-sm font-semibold transition-colors disabled:opacity-50 ${
              ativo
                ? 'border-photo-primary bg-photo-primary text-white'
                : 'border-painel-borda bg-white text-photo-ink hover:bg-painel-cabecalho'
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Interruptor (liga/desliga) com rótulo falado por leitores de tela. */
export function Interruptor({ rotulo, ligado, onChange, desabilitado = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={() => onChange(!ligado)}
      className="flex h-11 w-14 shrink-0 items-center justify-center disabled:opacity-50"
    >
      <span className={`relative block h-6 w-11 rounded-full transition-colors ${ligado ? 'bg-photo-success' : 'bg-painel-desligado'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${ligado ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function Campo({ rotulo, ajuda, erro, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-body-sm font-semibold text-photo-ink">{rotulo}</label>
      {children}
      {ajuda && !erro && <p className="mt-1 text-caption text-painel-texto2">{ajuda}</p>}
      {erro && <p role="alert" className="mt-1 text-caption text-painel-perigo">{erro}</p>}
    </div>
  );
}

export const CLASSE_INPUT =
  'mt-1 min-h-[44px] w-full rounded-lg border border-painel-borda bg-white px-3 text-body focus:border-photo-primary focus:outline-none focus:ring-2 focus:ring-photo-primary/30 disabled:opacity-50';

export function Aviso({ tom = 'amarelo', children }) {
  const classes = {
    amarelo: 'border-[#E8C86A] bg-[#FBEBB5]/60 text-[#5C4700]',
    perigo: 'border-painel-perigo bg-[#FAD9C7]/60 text-[#7A2E0E]',
    info: 'border-painel-borda bg-painel-cabecalho text-painel-texto2',
  };
  return <p className={`rounded-lg border px-4 py-3 text-body-sm ${classes[tom]}`}>{children}</p>;
}

// ── Avisos rápidos (toast) ───────────────────────────────────────────────────
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [mensagem, setMensagem] = useState('');
  const timer = useRef(null);

  const avisar = useCallback((texto) => {
    setMensagem(texto);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMensagem(''), 3500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={avisar}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-end">
        {mensagem && (
          <p className="pointer-events-auto max-w-sm rounded-lg bg-photo-ink px-4 py-3 text-body-sm text-photo-bone shadow-lg">
            {mensagem}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
