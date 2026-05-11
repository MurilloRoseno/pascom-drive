export default {
  nav: {
    concepts: 'Conceitos',
    calculator: 'Calculadora',
    simulation: 'Simulação',
    didactic: 'Aprofundamento',
    faq: 'Perguntas',
  },
  hero: {
    eyebrow: 'Relatividade Especial, Einstein 1905',
    title1: 'Dilatação',
    title2: 'do Tempo',
    subtitle: 'Quando a velocidade aproxima-se da luz, o próprio tempo se curva. Explore matematicamente o efeito mais extraordinário da física moderna.',
    ctaPrimary: 'Calcular Agora',
    ctaSecondary: 'Entender a Física',
    scroll: 'Explorar',
  },
  concepts: {
    sectionLabel: 'Fundamentos',
    title: 'Conceitos Centrais',
    intro: 'A relatividade especial revelou que o tempo não é absoluto. Ele se dilata ou contrai dependendo da velocidade relativa entre observadores.',
    cards: [
      {
        number: '01',
        title: 'Invariância da Luz',
        description: 'A velocidade da luz (c) é constante em todos os referenciais inerciais, independentemente do movimento da fonte ou do observador.',
      },
      {
        number: '02',
        title: 'Dilatação do Tempo',
        description: 'Um relógio em movimento passa o tempo mais lentamente comparado a um relógio em repouso, conforme visto por um observador estacionário.',
      },
      {
        number: '03',
        title: 'Fator de Lorentz',
        description: 'O parâmetro γ quantifica a intensidade dos efeitos relativísticos. Cresce dramáticamente quando v se aproxima de c.',
      },
    ],
  },
  calculator: {
    sectionLabel: 'Calcular',
    title: 'Calculadora de Dilatação',
    subtitle: 'Insira a velocidade e o tempo para calcular os efeitos relativísticos',
    modeLabel: 'Modo',
    modeRelative: 'Velocidade Relativa',
    modeGamma: 'Fator de Lorentz',
    velocityLabel: 'Velocidade (v)',
    speedOfLight: 'c (velocidade da luz)',
    percentage: '% da velocidade da luz',
    gammaLabel: 'Fator de Lorentz (γ)',
    timeLabel: 'Tempo Próprio (Δt₀)',
    year: 'ano',
    years: 'anos',
    resultLabel: 'Tempo Dilatado',
    resultDescription: 'Tempo observado no referencial estacionário',
    timeDilation: 'Dilatação de Tempo',
    timeDilationFormula: 'Δt = γ · Δt₀',
    gamma: 'γ (Fator de Lorentz)',
    gammaFormula: 'γ = 1 / √(1 - v²/c²)',
    calculateButton: 'Calcular',
    errorVelocityInvalid: 'Velocidade deve ser entre 0 e 0.99c',
    errorTimeInvalid: 'Tempo deve ser positivo',
  },
  simulation: {
    sectionLabel: 'Simulação',
    title: 'Simulação: Terra vs Nave',
    controlsLabel: 'Controles',
    velocityLabel: 'Velocidade da Nave',
    durationLabel: 'Duração da Viagem',
    lorentzLabel: 'Fator de Lorentz',
    lorentzDescription: 'Quanto o tempo se dilata para a nave em relação à Terra.',
    startButton: 'Iniciar',
    pauseButton: 'Pausar',
    timelineLabel: 'Timeline',
    earthLabel: 'TERRA',
    shipLabel: 'NAVE ESPACIAL',
    yearsLabel: 'anos',
    accumulatedLabel: 'Diferença acumulada',
    accumulatedDescription: (percent) => `A tripulante envelheceu ${percent}% menos que as pessoas na Terra.`,
  },
  didactic: {
    sectionLabel: 'Aprofundamento',
    title: 'Entenda o Cálculo',
    items: [
      {
        title: 'O que está acontecendo?',
        body: `
          A fórmula Δt = γ · Δt₀ descreve como o tempo se dilata conforme visto por um observador estacionário.

          Imagine um astronauta viajando a 99% da velocidade da luz. Para cada ano que passa na nave, aproximadamente 7 anos passam na Terra. Este é o fenômeno da dilatação do tempo.
        `,
      },
      {
        title: 'Quem observa o que?',
        body: `
          Δt₀ é o tempo "próprio" (medido no referencial da nave). Δt é o tempo "observado" (medido na Terra).

          Do ponto de vista da nave, a Terra está se movendo a 99% de c, então os relógios da Terra também correm lentamente. Mas como a nave é quem está acelerando, a nave envelhece menos em comparação.
        `,
      },
      {
        title: 'Por que γ cresce tão rápido?',
        body: `
          O fator de Lorentz é γ = 1 / √(1 - v²/c²). Conforme v se aproxima de c, o denominador se aproxima de zero, fazendo γ → ∞.

          Isso significa que a 99.99% de c, o tempo dilata enormemente. Nenhuma massa pode atingir c porque isso exigiria energia infinita.
        `,
      },
      {
        title: 'E-mail viaja mais rápido que luz?',
        body: `
          Não. Nada pode viajar mais rápido que a luz, nem informação. Se algo pudesse, violaria a causalidade (efeitos ocorreriam antes das causas em alguns referenciais).

          A relatividade especial preserva a ordem causal dos eventos, permitindo que o universo seja consistente.
        `,
      },
      {
        title: 'Por que Einstein teve essa ideia?',
        body: `
          Em 1905, as equações de Maxwell para o eletromagnetismo pareciam quebrar as leis clássicas de movimento. Einstein resolveu o conflito postulando que c é sempre constante, levando aos efeitos relativísticos.

          Este foi um salto lógico revolucionário que reformulou nossa compreensão de espaço e tempo.
        `,
      },
    ],
  },
  faq: {
    sectionLabel: 'Dúvidas',
    title: 'Perguntas Frequentes',
    items: [
      {
        q: 'O que é dilatação do tempo?',
        a: `Dilatação do tempo é o fenômeno relativístico em que relógios em movimento correm mais lentamente do que relógios em repouso, conforme observado por um observador estacionário. Este é um efeito real, comprovado experimentalmente.`,
      },
      {
        q: 'Já foi observado na prática?',
        a: `Sim. Múons (partículas criadas na atmosfera) vivem apenas 2,2 microssegundos no próprio referencial, mas devido à dilatação do tempo, conseguem atingir a superfície da Terra porque envelhecem mais lentamente em nosso referencial. Aceleradores de partículas confirmam isso diariamente.`,
      },
      {
        q: 'Por que não podemos viajar a velocidades relativísticas?',
        a: `Porque a energia necessária cresce sem limite conforme nos aproximamos de c. Para uma nave de 1000 toneladas atingir 99.9% de c, seria necessária mais energia que toda a humanidade consome em um ano. A relatividade o proíbe, não limitações de engenharia atuais.`,
      },
      {
        q: 'O que é o Fator de Lorentz?',
        a: `O Fator de Lorentz (γ) quantifica a intensidade dos efeitos relativísticos. É definido como γ = 1 / √(1 - v²/c²). Em baixas velocidades, γ ≈ 1. Em altas velocidades, γ cresce dramaticamente.`,
      },
      {
        q: 'Qual é a diferença entre dilatação do tempo e contração do espaço?',
        a: `Dilatação do tempo afeta a passagem do tempo em um referencial em movimento. Contração do espaço (Contração de Lorentz-FitzGerald) afeta o comprimento de objetos em movimento. Ambas são predições da relatividade especial e ocorrem simultaneamente.`,
      },
      {
        q: 'Essa calculadora é precisa?',
        a: `Sim. Usamos a fórmula relativística padrão Δt = γ · Δt₀, onde γ = 1 / √(1 - v²/c²). Esta é exatamente a fórmula da relatividade especial de Einstein. Todos os cálculos estão verificados contra dados físicos conhecidos.`,
      },
      {
        q: 'Qual é a velocidade máxima possível?',
        a: `c (299.792.458 metros por segundo, aproximadamente 300.000 km/s). Nada com massa pode alcançá-la. Fótons (luz) viajam sempre em c porque têm massa zero. Para qualquer objeto massivo, v < c sempre.`,
      },
    ],
  },
  footer: {
    footer_title: 'Eranildo Relativity Lab',
    tagline: 'Calculadora de Dilatação do Tempo, Relatividade Especial',
    credits: 'Baseada em Einstein, 1905',
    idealizer: 'Idealizador',
    developer: 'Desenvolvimento',
    linkedInUrl: 'https://www.linkedin.com/in/murilloroseno/',
  },
};
