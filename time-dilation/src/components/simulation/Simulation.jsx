import Section from '../layout/Section';
import SectionLabel from '../layout/SectionLabel';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import { useSimulation } from '../../hooks/useSimulation';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber, formatLorentz, formatPercent } from '../../lib/format';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Simulation() {
  const sim = useSimulation();
  const t = useTranslation();

  return (
    <Section id="simulation">
      <div className="max-w-5xl mx-auto mb-8">
        <SectionLabel text={t('simulation.sectionLabel')} />
        <h2 className="text-4xl md:text-5xl font-serif font-light text-text">
          {t('simulation.title')}
        </h2>
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls */}
        <Panel className="flex flex-col">
          <h3 className="text-xl font-serif font-bold text-gold mb-6">{t('simulation.controlsLabel')}</h3>

          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-mono text-text-dim uppercase mb-2">
                {t('simulation.velocityLabel')}
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
                <span className="text-sm font-mono text-accent w-12">
                  {formatNumber(sim.velocity, 2)}c
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-dim uppercase mb-2">
                {t('simulation.durationLabel')}
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
                <span className="text-sm font-mono text-accent w-12">
                  {sim.duration}y
                </span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="text-xs font-mono text-text-dim uppercase mb-3">{t('simulation.lorentzLabel')}</div>
              <div className="text-3xl font-mono text-gold mb-4">
                {formatLorentz(sim.gamma)}
              </div>
              <div className="text-xs text-text-dim">
                {t('simulation.lorentzDescription')}
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
          <h3 className="text-xl font-serif font-bold text-text mb-6">{t('simulation.timelineLabel')}</h3>

          {/* Earth Timeline */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-mono text-accent">{t('simulation.earthLabel')}</h4>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-accent">
                  {formatNumber(sim.earthAge, 2)}
                </div>
                <div className="text-xs text-text-dim font-mono">{t('simulation.yearsLabel')}</div>
              </div>
            </div>
            <div className="relative h-12 bg-black/30 rounded border border-accent/30 overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-accent/50 rounded"
                animate={{ width: `${sim.progress * 100}%` }}
                transition={{ type: 'tween', duration: 0.05 }}
              />
              <div className="absolute inset-0 flex items-center pl-3">
                <div className="text-xs font-mono text-deep font-bold">
                  {formatPercent(sim.progress)}
                </div>
              </div>
            </div>
          </div>

          {/* Spaceship Timeline */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-mono text-gold">{t('simulation.shipLabel')}</h4>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-gold">
                  {formatNumber(sim.shipAge, 2)}
                </div>
                <div className="text-xs text-text-dim font-mono">{t('simulation.yearsLabel')}</div>
              </div>
            </div>
            <div className="relative h-12 bg-black/30 rounded border border-gold/30 overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-gold to-gold/50 rounded"
                animate={{ width: `${(sim.progress * (1 / sim.gamma)) * 100}%` }}
                transition={{ type: 'tween', duration: 0.05 }}
              />
              <div className="absolute inset-0 flex items-center pl-3">
                <div className="text-xs font-mono text-deep font-bold">
                  {formatPercent(sim.progress * (1 / sim.gamma))}
                </div>
              </div>
            </div>
          </div>

          {/* Time Difference */}
          <div className="mt-8 p-4 rounded bg-gold/10 border border-gold/30">
            <div className="text-xs font-mono text-text-dim uppercase mb-2">{t('simulation.accumulatedLabel')}</div>
            <div className="text-2xl font-mono text-gold">
              {formatNumber(sim.earthAge - sim.shipAge, 2)} {t('simulation.yearsLabel')}
            </div>
            <div className="text-xs text-text-dim mt-2">
              {t('simulation.accumulatedDescription')(
                formatNumber(((sim.earthAge - sim.shipAge) / sim.earthAge) * 100, 1)
              )}
            </div>
          </div>
        </Panel>
      </div>
    </Section>
  );
}
