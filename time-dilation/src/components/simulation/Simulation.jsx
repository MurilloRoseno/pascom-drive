import Section from '../layout/Section';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import { useSimulation } from '../../hooks/useSimulation';
import { formatNumber, formatLorentz, formatPercent } from '../../lib/format';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Simulation() {
  const sim = useSimulation();

  return (
    <Section title="Simulação: Terra vs Nave" id="simulation">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls */}
        <Panel className="flex flex-col">
          <h3 className="text-xl font-serif font-bold text-accent-amber mb-6">Controles</h3>

          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-mono text-text-muted uppercase mb-2">
                Velocidade da Nave
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0"
                  max="0.99"
                  step="0.01"
                  value={sim.velocity}
                  onChange={(e) => sim.setVelocity(parseFloat(e.target.value))}
                  disabled={sim.isPlaying}
                  className="flex-1"
                />
                <span className="text-sm font-mono text-accent-cyan w-12">
                  {formatNumber(sim.velocity, 2)}c
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-muted uppercase mb-2">
                Duração da Viagem
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={sim.duration}
                  onChange={(e) => sim.setDuration(parseInt(e.target.value))}
                  disabled={sim.isPlaying}
                  className="flex-1"
                />
                <span className="text-sm font-mono text-accent-cyan w-12">
                  {sim.duration}y
                </span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="text-xs font-mono text-text-muted uppercase mb-3">Fator de Lorentz</div>
              <div className="text-3xl font-mono text-accent-violet mb-4">
                {formatLorentz(sim.gamma)}
              </div>
              <div className="text-xs text-text-muted">
                Quanto o tempo se dilata para a nave em relação à Terra.
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex gap-2">
              <Button
                variant={sim.progress >= 1 ? 'outline' : (sim.isPlaying ? 'secondary' : 'primary')}
                onClick={sim.togglePlay}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {sim.isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {sim.isPlaying ? 'Pausar' : 'Iniciar'}
              </Button>
              <Button variant="outline" onClick={sim.reset} size="sm" className="p-2">
                <RotateCcw size={18} />
              </Button>
            </div>
          </div>
        </Panel>

        {/* Timeline Visualization */}
        <Panel className="lg:col-span-2 flex flex-col">
          <h3 className="text-xl font-serif font-bold text-text-primary mb-6">Timeline</h3>

          {/* Earth Timeline */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-mono text-accent-cyan">TERRA</h4>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-accent-cyan">
                  {formatNumber(sim.earthAge, 2)}
                </div>
                <div className="text-xs text-text-muted font-mono">anos</div>
              </div>
            </div>
            <div className="relative h-12 bg-black/30 rounded border border-accent-cyan/30 overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-cyan to-accent-cyan/50 rounded"
                animate={{ width: `${sim.progress * 100}%` }}
                transition={{ type: 'tween', duration: 0.05 }}
              />
              <div className="absolute inset-0 flex items-center pl-3">
                <div className="text-xs font-mono text-black font-bold">
                  {formatPercent(sim.progress)}
                </div>
              </div>
            </div>
          </div>

          {/* Spaceship Timeline */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-mono text-accent-amber">NAVE ESPACIAL</h4>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-accent-amber">
                  {formatNumber(sim.shipAge, 2)}
                </div>
                <div className="text-xs text-text-muted font-mono">anos</div>
              </div>
            </div>
            <div className="relative h-12 bg-black/30 rounded border border-accent-amber/30 overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-amber to-accent-amber/50 rounded"
                animate={{ width: `${(sim.progress * (1 / sim.gamma)) * 100}%` }}
                transition={{ type: 'tween', duration: 0.05 }}
              />
              <div className="absolute inset-0 flex items-center pl-3">
                <div className="text-xs font-mono text-black font-bold">
                  {formatPercent(sim.progress * (1 / sim.gamma))}
                </div>
              </div>
            </div>
          </div>

          {/* Time Difference */}
          <div className="mt-8 p-4 rounded bg-accent-violet/10 border border-accent-violet/30">
            <div className="text-xs font-mono text-text-muted uppercase mb-2">Diferença acumulada</div>
            <div className="text-2xl font-mono text-accent-violet">
              {formatNumber(sim.earthAge - sim.shipAge, 2)} anos
            </div>
            <div className="text-xs text-text-muted mt-2">
              A tripulante envelheceu {formatNumber(
                ((sim.earthAge - sim.shipAge) / sim.earthAge) * 100,
                1
              )}% menos que as pessoas na Terra.
            </div>
          </div>
        </Panel>
      </div>
    </Section>
  );
}
