import './styles/globals.css';
import Starfield from './components/layout/Starfield';
import Hero from './components/hero/Hero';
import TheoryBlock from './components/theory/TheoryBlock';
import Calculator from './components/calculator/Calculator';
import Simulation from './components/simulation/Simulation';
import Didactic from './components/didactic/Didactic';
import Faq from './components/faq/Faq';

export default function App() {
  return (
    <>
      <Starfield />
      <main className="relative z-10">
        <Hero />
        <TheoryBlock />
        <Calculator />
        <Simulation />
        <Didactic />
        <Faq />
        <footer className="bg-black/40 border-t border-white/10 py-12 px-4 text-center text-text-muted text-sm">
          <p className="font-serif text-accent-cyan text-base mb-3">Eranildo Relativity Lab</p>
          <p>Calculadora de Dilatação do Tempo • Relatividade Especial • Baseada em Einstein (1905)</p>
          <p className="mt-3 text-xs">
            Inspirado em{' '}
            <a href="https://www.omnicalculator.com/pt/fisica/calculadora-dilatacao-do-tempo" className="text-accent-violet hover:underline">
              Omni Calculator
            </a>
          </p>
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs">
              <span className="font-semibold">Idealizador:</span> Eranildo Sobral
            </p>
            <p className="text-xs mt-1">
              <span className="font-semibold">Desenvolvimento:</span> Murillo Lima
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
