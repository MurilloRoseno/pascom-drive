const ORNAMENT_STAR = (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, flexShrink: 0 }}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function Footer() {
  return (
    <footer style={{ background: 'var(--photo-primary-dark)', color: 'var(--photo-bone)' }} className="pt-10 pb-6">

      {/* Ornamento decorativo no topo */}
      <div className="divider-ornament container" style={{ marginTop: 0, marginBottom: '2rem' }}>
        {ORNAMENT_STAR}
      </div>

      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          <div>
            <img
              src="/assets/logo-white.png"
              alt="Paróquia São Rafael"
              className="h-16 mb-4"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <p className="font-display text-lg font-semibold mb-2" style={{ color: 'var(--photo-bone)' }}>
              Paróquia São Rafael
            </p>
            <p className="font-mono text-[0.55rem] tracking-widest uppercase mb-3" style={{ color: 'var(--photo-accent)' }}>
              Diocese de Imperatriz · MA
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,237,224,0.6)' }}>
              Servindo a comunidade de Açailândia com fé, esperança e caridade.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-4">Navegação</p>
            <ul className="space-y-2 text-sm" style={{ color: 'rgba(244,237,224,0.6)' }}>
              {['Início', 'Galeria de Fotos', 'Sobre', 'Contato'].map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    style={{ color: 'rgba(244,237,224,0.6)', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--photo-accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(244,237,224,0.6)'}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">Contato</p>
            <ul className="space-y-3 text-sm" style={{ color: 'rgba(244,237,224,0.6)' }}>
              <li>📍 Açailândia — Maranhão</li>
              <li>📞 (99) 9 8206-1089</li>
              <li>✉️ paroquiasaorafael@hotmail.com</li>
              <li>🕐 Seg–Sex: 8h–12h e 14h–18h</li>
            </ul>
          </div>

        </div>

        <div className="border-t pt-5 text-center text-xs" style={{ borderColor: 'rgba(244,237,224,0.15)', color: 'rgba(244,237,224,0.35)' }}>
          © 2026 Paróquia São Rafael — Açailândia/MA. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
