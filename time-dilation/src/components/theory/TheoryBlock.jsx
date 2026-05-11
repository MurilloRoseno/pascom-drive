import Section from '../layout/Section';
import Panel from '../ui/Panel';
import { InlineFormula } from '../ui/Formula';

export default function TheoryBlock() {
  const cards = [
    {
      title: 'O Tempo é Relativo',
      description: (
        <>
          Não existe um "tempo absoluto". O tempo passa de forma diferente dependendo da sua
          velocidade e da sua posição no espaço. Dois observadores em movimento relativo medem
          diferentes intervalos de tempo para o mesmo evento.
        </>
      ),
    },
    {
      title: 'O Fator de Lorentz (γ)',
      description: (
        <>
          O <InlineFormula math="\gamma = \frac{1}{\sqrt{1 - v^2/c^2}}" /> determina quanto o tempo
          se dilata. Quanto mais rápido você viaja, maior é o fator e mais lentamente o tempo passa
          para você em relação a um observador parado.
        </>
      ),
    },
    {
      title: 'Quando o Efeito Aparece?',
      description: (
        <>
          O efeito se torna significativo quando v &gt; 0.1c. A velocidades cotidianas (carro, avião),
          o efeito é desprezível. Mas para naves espaciais relativísticas ou partículas subatômicas,
          o efeito é mensurável e importante.
        </>
      ),
    },
    {
      title: 'Por Que Parece Irrelevante?',
      description: (
        <>
          Não temos tecnologia para alcançar velocidades próximas à da luz. A velocidade mais rápida
          já alcançada por humanos (~11 km/s no Apolo 10) dá γ ≈ 1.0000000007. Precisaríamos de
          velocidades de milhares de km/s para sentir o efeito.
        </>
      ),
    },
  ];

  return (
    <Section title="Entenda a Dilatação do Tempo" id="theory">
      <div className="grid md:grid-cols-2 gap-8">
        {cards.map((card, i) => (
          <Panel key={i} className="flex flex-col">
            <h3 className="text-xl font-serif font-bold text-accent-cyan mb-4">{card.title}</h3>
            <p className="text-text-muted leading-relaxed text-sm md:text-base">{card.description}</p>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
