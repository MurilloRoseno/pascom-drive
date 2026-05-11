import { useContext } from 'react';
import { LanguageContext } from '../../i18n/LanguageProvider';
import { useTranslation } from '../../i18n/useTranslation';

export default function Nav() {
  const { lang, setLang } = useContext(LanguageContext);
  const t = useTranslation();

  const navLinks = [
    { label: t('nav.concepts'), id: 'concepts' },
    { label: t('nav.calculator'), id: 'calculator' },
    { label: t('nav.simulation'), id: 'simulation' },
    { label: t('nav.didactic'), id: 'didactic' },
    { label: t('nav.faq'), id: 'faq' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-deep/95 backdrop-blur border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <img
            src="/favicon.png"
            alt="Eranildo Relativity Lab"
            className="w-8 h-8 rounded-full group-hover:brightness-110 transition-all"
          />
          <span className="font-display font-semibold text-sm text-gold tracking-wider">
            ERL
          </span>
        </a>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="text-xs font-mono text-text-dim hover:text-gold transition-colors uppercase tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Language Toggle */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-6">
          <button
            onClick={() => setLang('pt-BR')}
            className={`text-xs font-mono uppercase tracking-wide font-semibold transition-colors ${
              lang === 'pt-BR' ? 'text-gold' : 'text-text-faint hover:text-text-dim'
            }`}
          >
            PT
          </button>
          <span className="text-text-faint text-xs">/</span>
          <button
            onClick={() => setLang('en')}
            className={`text-xs font-mono uppercase tracking-wide font-semibold transition-colors ${
              lang === 'en' ? 'text-gold' : 'text-text-faint hover:text-text-dim'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </nav>
  );
}
