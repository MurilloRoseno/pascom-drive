import Button from '../ui/Button';
import { BlockFormula } from '../ui/Formula';

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-gradient-radial from-accent-violet/20 via-transparent to-transparent blur-3xl -z-10" />

      <div className="text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-text-primary mb-6 leading-tight">
          O Tempo é <span className="text-accent-cyan">Relativo</span>
        </h1>

        <p className="text-lg md:text-xl text-text-muted mb-8 leading-relaxed">
          Explore a dilatação do tempo relativístico. Veja como a velocidade distorce a passagem
          do tempo — um fenômeno real comprovado pela física moderna.
        </p>

        <div className="my-12">
          <BlockFormula math="\Delta t' = \frac{\Delta t}{\sqrt{1 - \frac{v^2}{c^2}}} = \Delta t \cdot \gamma" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="primary" onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}>
            Calcular agora
          </Button>
          <Button size="lg" variant="secondary" onClick={() => document.getElementById('simulation')?.scrollIntoView({ behavior: 'smooth' })}>
            Ver simulação
          </Button>
        </div>
      </div>
    </section>
  );
}
