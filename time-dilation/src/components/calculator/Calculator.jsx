import Section from '../layout/Section';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import { useCalculator } from '../../hooks/useCalculator';
import { formatNumber, formatLorentz, formatPercent } from '../../lib/format';
import { velocityUnits, timeUnits } from '../../lib/units';
import { Copy, RotateCcw } from 'lucide-react';

export default function Calculator() {
  const calc = useCalculator();

  const modes = [
    { id: 'dilated', label: 'Tempo Dilatado (Δt\')', fields: ['Δt (tempo próprio)', 'v (velocidade)'] },
    { id: 'proper', label: 'Tempo Próprio (Δt)', fields: ['Δt\' (tempo dilatado)', 'v (velocidade)'] },
    { id: 'velocity', label: 'Velocidade (v)', fields: ['Δt (tempo próprio)', 'Δt\' (tempo dilatado)'] },
    { id: 'lorentz', label: 'Fator de Lorentz (γ)', fields: ['v (velocidade)'] },
  ];

  const currentMode = modes.find(m => m.id === calc.mode);
  const showSecondInput = calc.mode !== 'lorentz';

  const handleShare = () => {
    const params = new URLSearchParams({
      mode: calc.mode,
      input1: calc.input1,
      input2: calc.input2,
      velocityUnit: calc.velocityUnit,
      timeUnit: calc.timeUnit,
    });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
  };

  return (
    <Section title="Calculadora de Dilatação do Tempo" id="calculator">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <Panel className="flex flex-col">
          <h3 className="text-2xl font-serif font-bold text-accent-violet mb-6">
            {currentMode?.label}
          </h3>

          {/* Mode Selector */}
          <div className="flex flex-wrap gap-2 mb-8">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => calc.setMode(m.id)}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  calc.mode === m.id
                    ? 'bg-accent-violet text-black'
                    : 'bg-black/30 text-text-muted hover:bg-black/50'
                }`}
              >
                {m.id === 'dilated' && 'Δt\''}
                {m.id === 'proper' && 'Δt'}
                {m.id === 'velocity' && 'v'}
                {m.id === 'lorentz' && 'γ'}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            {/* Input 1 */}
            <div>
              <label className="block text-sm font-mono text-text-muted mb-2">
                {calc.mode === 'lorentz' ? 'Velocidade' : currentMode?.fields[0]}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={calc.input1}
                  onChange={(e) => calc.setInput1(e.target.value)}
                  className="flex-1 px-4 py-2 rounded bg-black/40 border border-white/10 text-text-primary font-mono focus:outline-none focus:border-accent-cyan"
                />
                {calc.mode === 'lorentz' && (
                  <select
                    value={calc.velocityUnit}
                    onChange={(e) => calc.setVelocityUnit(e.target.value)}
                    className="px-3 py-2 rounded bg-black/40 border border-white/10 text-text-primary focus:outline-none focus:border-accent-cyan"
                  >
                    {Object.entries(velocityUnits).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Input 2 */}
            {showSecondInput && (
              <div>
                <label className="block text-sm font-mono text-text-muted mb-2">
                  {currentMode?.fields[1]}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={calc.input2}
                    onChange={(e) => calc.setInput2(e.target.value)}
                    className="flex-1 px-4 py-2 rounded bg-black/40 border border-white/10 text-text-primary font-mono focus:outline-none focus:border-accent-cyan"
                  />
                  <select
                    value={calc.mode === 'velocity' ? calc.timeUnit : calc.velocityUnit}
                    onChange={(e) =>
                      calc.mode === 'velocity'
                        ? calc.setTimeUnit(e.target.value)
                        : calc.setVelocityUnit(e.target.value)
                    }
                    className="px-3 py-2 rounded bg-black/40 border border-white/10 text-text-primary focus:outline-none focus:border-accent-cyan"
                  >
                    {(calc.mode === 'velocity'
                      ? Object.entries(timeUnits)
                      : Object.entries(velocityUnits)
                    ).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Time Unit (for non-velocity modes) */}
            {calc.mode !== 'velocity' && calc.mode !== 'lorentz' && (
              <div>
                <label className="block text-sm font-mono text-text-muted mb-2">
                  Unidade de tempo
                </label>
                <select
                  value={calc.timeUnit}
                  onChange={(e) => calc.setTimeUnit(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-black/40 border border-white/10 text-text-primary focus:outline-none focus:border-accent-cyan"
                >
                  {Object.entries(timeUnits).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {calc.error && (
              <div className="p-3 rounded bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
                {calc.error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                onClick={calc.calculate}
                className="flex-1"
              >
                Calcular
              </Button>
              <Button
                variant="outline"
                onClick={calc.reset}
                size="sm"
                className="p-2"
              >
                <RotateCcw size={20} />
              </Button>
            </div>
          </div>
        </Panel>

        {/* Result Panel */}
        <Panel className="flex flex-col justify-between">
          {calc.result ? (
            <>
              <div>
                <h4 className="text-lg font-mono text-text-muted mb-6">
                  {calc.result.resultLabel}
                </h4>
                <div className="mb-8">
                  <div className="text-5xl md:text-6xl font-mono font-bold text-accent-cyan mb-2">
                    {formatNumber(calc.result.result, 6)}
                  </div>
                  <div className="text-sm text-text-muted font-mono">
                    {calc.mode === 'lorentz' ? '(adimensional)' : (calc.mode === 'velocity' ? velocityUnits[calc.velocityUnit].label : timeUnits[calc.timeUnit].label)}
                  </div>
                </div>

                {/* Lorentz Factor Display */}
                <div className="space-y-4 border-t border-white/10 pt-6">
                  <div>
                    <div className="text-xs font-mono text-text-muted uppercase mb-2">Fator de Lorentz (γ)</div>
                    <div className="text-2xl font-mono text-accent-violet">
                      {formatLorentz(calc.result.gamma)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-text-muted uppercase mb-2">Velocidade</div>
                    <div className="text-xl font-mono text-accent-amber">
                      {formatPercent(calc.result.vPercent / 100)} c
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="mt-6 w-full px-4 py-2 rounded bg-black/30 border border-white/10 text-text-muted hover:border-accent-cyan hover:text-accent-cyan transition flex items-center justify-center gap-2 text-sm"
              >
                <Copy size={16} /> Compartilhar resultado
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-text-muted mb-4">Preencha os valores e clique em "Calcular"</div>
            </div>
          )}
        </Panel>
      </div>
    </Section>
  );
}
