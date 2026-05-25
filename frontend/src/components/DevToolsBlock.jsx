import { useEffect, useState } from 'react';

export default function DevToolsBlock() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => setVisible(e.detail?.open === true);
    window.addEventListener('pascom:devtools-detected', handler);
    return () => window.removeEventListener('pascom:devtools-detected', handler);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(109,32,119,0.92)', zIndex: 9999 }}
      aria-modal="true"
      role="alertdialog"
      aria-label="Área protegida"
    >
      <div
        className="max-w-md w-full rounded-xl p-8 text-center"
        style={{ background: 'rgba(24,21,15,0.85)', border: '1px solid rgba(247,200,72,0.35)' }}
      >
        <div className="text-5xl mb-4">🛡️</div>

        <h2
          className="font-display font-bold text-xl mb-3"
          style={{ color: '#F7C848' }}
        >
          Área protegida
        </h2>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#FAF6EF' }}>
          Detectamos que o DevTools está aberto. As fotos são propriedade da{' '}
          <strong>Paróquia São Rafael</strong> e contêm marca d&apos;água. Reprodução
          não autorizada é proibida{' '}
          <span style={{ color: 'rgba(250,246,239,0.7)' }}>(Lei 9.610/98)</span>.
        </p>

        <p className="text-sm leading-relaxed mb-5" style={{ color: '#FAF6EF' }}>
          Se você é desenvolvedor e precisa inspecionar, feche o DevTools ou
          digite no console:
        </p>

        <code
          className="block rounded px-4 py-2 font-mono text-sm mb-5"
          style={{ background: 'rgba(247,200,72,0.12)', color: '#F7C848', border: '1px solid rgba(247,200,72,0.3)' }}
        >
          pascomUnlock()
        </code>

        <p className="text-xs" style={{ color: 'rgba(250,246,239,0.5)' }}>
          e atualize a página (F5).
        </p>
      </div>
    </div>
  );
}
