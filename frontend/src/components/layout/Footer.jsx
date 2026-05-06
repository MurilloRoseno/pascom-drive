export default function Footer() {
  return (
    <footer className="bg-photo-primary-dark text-white pt-12 pb-6">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          <div>
            <img
              src="/assets/logo-white.png"
              alt="Paróquia São Rafael"
              className="h-16 mb-4"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <p className="font-display text-lg font-semibold mb-2">Paróquia São Rafael</p>
            <p className="text-sm text-photo-accent/90 leading-relaxed">
              Servindo a comunidade de Açailândia com fé, esperança e caridade.
            </p>
          </div>

          <div>
            <p className="font-display text-base font-semibold mb-4">Navegação</p>
            <ul className="space-y-2 text-sm text-white/80">
              {['Início', 'Galeria de Fotos', 'Sobre', 'Contato'].map((label) => (
                <li key={label}>
                  <a href="#" className="hover:text-photo-accent transition-colors duration-base">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-display text-base font-semibold mb-4">Contato</p>
            <ul className="space-y-3 text-sm text-white/80">
              <li>📍 Açailândia — Maranhão</li>
              <li>📞 (99) 9 8206-1089</li>
              <li>✉️ paroquiasaorafael@hotmail.com</li>
              <li>🕐 Seg–Sex: 8h–12h e 14h–18h</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/20 pt-5 text-center text-xs text-white/50">
          © 2026 Paróquia São Rafael — Açailândia/MA. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
