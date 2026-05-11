import './styles/globals.css';
import { LanguageProvider } from './i18n/LanguageProvider';
import { useTranslation } from './i18n/useTranslation';
import Starfield from './components/layout/Starfield';
import Nav from './components/layout/Nav';
import Hero from './components/hero/Hero';
import TheoryBlock from './components/theory/TheoryBlock';
import Calculator from './components/calculator/Calculator';
import Simulation from './components/simulation/Simulation';
import Didactic from './components/didactic/Didactic';
import Faq from './components/faq/Faq';

function AppContent() {
  const t = useTranslation();

  return (
    <>
      <Starfield />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <TheoryBlock />
        <Calculator />
        <Simulation />
        <Didactic />
        <Faq />
        <footer className="bg-void/50 border-t border-white/10 py-12 px-4 text-center">
          <p className="font-display text-gold text-lg mb-3 tracking-wide">{t('footer.footer_title') || 'Eranildo Relativity Lab'}</p>
          <p className="text-xs font-mono text-text-dim mb-8">{t('footer.tagline')}</p>

          <div className="mt-8 pt-8 border-t border-white/10 max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {/* Eranildo Card */}
              <div className="flex items-center gap-4">
                <img
                  src="/favicon.png"
                  alt="Eranildo Sobral"
                  className="w-10 h-10 rounded-full border border-gold/30"
                />
                <div className="text-left">
                  <p className="text-xs font-mono text-gold uppercase tracking-wide">{t('footer.idealizer')}</p>
                  <p className="text-sm text-text">Eranildo Sobral</p>
                </div>
              </div>

              {/* Murillo Card */}
              <div className="text-left">
                <p className="text-xs font-mono text-gold uppercase tracking-wide">{t('footer.developer')}</p>
                <a
                  href={t('footer.linkedInUrl')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text hover:text-gold-light transition-colors underline decoration-1 underline-offset-2"
                >
                  Murillo Lima
                </a>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-faint mt-8">{t('footer.credits')}</p>
        </footer>
      </main>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
