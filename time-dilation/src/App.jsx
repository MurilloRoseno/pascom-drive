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
        <footer className="bg-gradient-to-b from-void/0 to-void/80 border-t border-gold/20 py-16 md:py-24 px-4 text-center">
          <p className="font-display text-gold text-2xl md:text-3xl mb-4 tracking-wider font-semibold">{t('footer.footer_title') || 'Eranildo Relativity Lab'}</p>
          <p className="text-xs md:text-sm font-mono text-text-dim mb-12 uppercase tracking-widest">{t('footer.tagline')}</p>

          <div className="mt-12 pt-12 border-t border-gold/20 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 mb-12">
              {/* Eranildo Card */}
              <div className="flex flex-col items-center">
                <img
                  src="/favicon.png"
                  alt="Eranildo Sobral"
                  className="w-16 h-16 rounded-full border-2 border-gold/40 mb-4"
                />
                <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t('footer.idealizer')}</p>
                <p className="text-base md:text-lg text-text font-serif">Eranildo Sobral</p>
              </div>

              {/* Murillo Card */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-gold/40 mb-4 flex items-center justify-center">
                  <span className="text-2xl text-gold">→</span>
                </div>
                <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{t('footer.developer')}</p>
                <a
                  href={t('footer.linkedInUrl')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base md:text-lg text-gold font-serif hover:text-gold-light transition-colors hover:underline decoration-2 underline-offset-3"
                >
                  Murillo Lima
                </a>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-faint mt-12">{t('footer.credits')}</p>
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
