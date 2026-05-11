import { useState } from 'react';
import Section from '../layout/Section';
import Panel from '../ui/Panel';
import { BlockFormula, InlineFormula } from '../ui/Formula';
import { ChevronDown } from 'lucide-react';

export default function Didactic() {
  const [expanded, setExpanded] = useState(0);

  const items = [
    {
      title: 'O que está acontecendo?',
      content: (
        <>
          <p className="mb-4">
            Quando você viaja a uma velocidade próxima à da luz, o tempo passa mais lentamente para você
            em comparação com alguém parado. Se você viajar a 90% da velocidade da luz (0.9c) por 1 ano,
            menos tempo passa para você a bordo da nave.
          </p>
          <p>
            Este não é um efeito psicológico ou ilusório — é um efeito real e mensurável previsto pela
            Teoria da Relatividade Especial de Einstein (1905).
          </p>
        </>
      ),
    },
    {
      title: 'Por que o tempo desacelera?',
      content: (
        <>
          <p className="mb-4">
            Na relatividade, a velocidade da luz (c ≈ 300.000 km/s) é a velocidade máxima do universo e
            é constante para todos os observadores. Para manter c constante, o tempo deve passar de forma
            diferente dependendo da velocidade.
          </p>
          <p className="mb-4">
            Imagine que a luz é como um "relógio" do universo. Se você se move rápido, a distância que
            a luz percorre em relação a você muda, mas c permanece a mesma. A única forma de c permanecer
            constante é o tempo passar mais lentamente para você.
          </p>
          <BlockFormula math="c = \frac{\text{distância}}{\text{tempo}} = \text{constante}" />
        </>
      ),
    },
    {
      title: 'Como o cálculo foi feito?',
      content: (
        <>
          <p className="mb-4">
            A fórmula de dilatação do tempo vem diretamente da transformação de Lorentz:
          </p>
          <BlockFormula math="\Delta t' = \gamma \cdot \Delta t \quad \text{onde} \quad \gamma = \frac{1}{\sqrt{1 - \frac{v^2}{c^2}}}" />
          <p className="mb-4 mt-4">
            <strong>Passo a passo:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Você fornece a velocidade (v) e o tempo próprio (Δt)</li>
            <li>Calculamos v/c (que percentual da velocidade da luz é sua velocidade)</li>
            <li>Calculamos <InlineFormula math="1 - (v/c)^2" /></li>
            <li>Calculamos a raiz quadrada e invertemos: <InlineFormula math="\gamma" /></li>
            <li>Multiplicamos o tempo próprio por γ para obter o tempo dilatado</li>
          </ol>
        </>
      ),
    },
    {
      title: 'Exemplo prático',
      content: (
        <>
          <p className="mb-4">
            <strong>Você viaja para Próxima Centauri (4.37 anos-luz) a 0.9c:</strong>
          </p>
          <div className="bg-black/30 p-4 rounded mb-4 text-sm font-mono">
            <div>v = 0.9c</div>
            <div>γ = 1 / √(1 - 0.9²) = 1 / √(0.19) ≈ 2.29</div>
            <div>Tempo na Terra: 4.37 / 0.9 ≈ 4.85 anos</div>
            <div>Tempo para você: 4.85 / 2.29 ≈ 2.12 anos</div>
          </div>
          <p>
            Você envelhecerá apenas 2.12 anos enquanto 4.85 anos passam na Terra. Ao retornar, 9.7 anos
            terão passado na Terra, mas você envelheceu apenas 4.24 anos!
          </p>
        </>
      ),
    },
    {
      title: 'Curiosidade científica',
      content: (
        <>
          <p className="mb-4">
            <strong>Paradoxo dos Gêmeos (Twin Paradox):</strong> Um gêmeo permanece na Terra enquanto o outro
            viaja a alta velocidade e retorna. O gêmeo viajante envelhece menos e ainda é mais jovem quando
            retorna. Este "paradoxo" foi comprovado experimentalmente com múons e relógios atômicos.
          </p>
          <p className="mb-4">
            <strong>Múons na atmosfera:</strong> Múons são partículas criadas quando raios cósmicos colidem
            com a atmosfera. Sem dilatação do tempo, a maioria decairia antes de chegar ao solo. Mas como
            se movem perto de c, sua vida útil é dilatada, e conseguem chegar intactos.
          </p>
          <p>
            <strong>GPS:</strong> Os satélites GPS orbitam a ~14.000 km/h. Se não corrigíssemos os efeitos
            relativísticos, o GPS estaria 10 km errado a cada dia!
          </p>
        </>
      ),
    },
  ];

  return (
    <Section title="Entenda o Cálculo" id="didactic">
      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((item, i) => (
          <Panel key={i} interactive className="cursor-pointer" onClick={() => setExpanded(expanded === i ? -1 : i)}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-serif font-bold text-text-primary">
                {item.title}
              </h4>
              <ChevronDown
                size={24}
                className={`text-accent-cyan transition-transform ${
                  expanded === i ? 'rotate-180' : ''
                }`}
              />
            </div>
            {expanded === i && (
              <div className="mt-4 pt-4 border-t border-white/10 text-text-muted text-sm leading-relaxed">
                {item.content}
              </div>
            )}
          </Panel>
        ))}
      </div>
    </Section>
  );
}
