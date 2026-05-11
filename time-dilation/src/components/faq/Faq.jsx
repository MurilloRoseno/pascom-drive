import { useState } from 'react';
import Section from '../layout/Section';
import Panel from '../ui/Panel';
import { InlineFormula } from '../ui/Formula';
import { ChevronDown } from 'lucide-react';

export default function Faq() {
  const [expanded, setExpanded] = useState(-1);

  const faqs = [
    {
      q: 'O que é dilatação do tempo?',
      a: 'É o efeito onde o tempo passa mais lentamente para um objeto em movimento rápido em relação a um observador parado. Quanto mais rápido você se move, mais lentamente o tempo passa para você.',
    },
    {
      q: 'Como calcular a dilatação do tempo?',
      a: (
        <>
          Use a fórmula: <InlineFormula math="\Delta t' = \frac{\Delta t}{\sqrt{1 - v^2/c^2}}" />. Você precisa de: o tempo
          próprio (Δt), a velocidade (v) e a velocidade da luz (c ≈ 300.000 km/s).
        </>
      ),
    },
    {
      q: 'Como encontrar o tempo próprio?',
      a: (
        <>
          Inverta a fórmula: <InlineFormula math="\Delta t = \frac{\Delta t'}{\gamma}" /> onde γ é o fator
          de Lorentz. Você fornece o tempo dilatado (Δt') observado de fora e calcula quanto tempo passou
          para o objeto em movimento.
        </>
      ),
    },
    {
      q: 'A luz sofre dilatação do tempo?',
      a: 'Não. A dilatação do tempo ocorre para velocidades menores que c. A luz sempre viaja a c e seu "tempo" seria infinitamente dilatado (ou tecnicamente, o tempo não passa para a luz).',
    },
    {
      q: 'O que é o fator de Lorentz?',
      a: (
        <>
          É <InlineFormula math="\gamma = \frac{1}{\sqrt{1 - v^2/c^2}}" /> — um número que quantifica quanto o tempo
          se dilata. γ = 1 quando v = 0 (sem dilatação). γ aumenta conforme v se aproxima de c.
        </>
      ),
    },
    {
      q: 'Qual a diferença entre dilatação temporal e gravitacional?',
      a: 'Dilatação temporal (relatividade especial) depende da velocidade relativa. Dilatação gravitacional (relatividade geral) depende do campo gravitacional intenso. Ambas causam que o tempo passe de forma diferente, mas por razões físicas distintas.',
    },
    {
      q: 'Isso já foi comprovado experimentalmente?',
      a: 'Sim! Múons (partículas subatômicas) chegam à superfície da Terra porque sua vida útil é dilatada. Relógios atômicos em aviões e satélites confirmam o efeito. O GPS precisa corrigir estes efeitos para funcionar corretamente.',
    },
  ];

  return (
    <Section title="Perguntas Frequentes" id="faq">
      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <Panel key={i} interactive className="cursor-pointer" onClick={() => setExpanded(expanded === i ? -1 : i)}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-serif font-bold text-text-primary">
                {faq.q}
              </h4>
              <ChevronDown
                size={24}
                className={`text-accent-cyan transition-transform flex-shrink-0 ml-4 ${
                  expanded === i ? 'rotate-180' : ''
                }`}
              />
            </div>
            {expanded === i && (
              <div className="mt-4 pt-4 border-t border-white/10 text-text-muted text-sm leading-relaxed">
                {faq.a}
              </div>
            )}
          </Panel>
        ))}
      </div>
    </Section>
  );
}
