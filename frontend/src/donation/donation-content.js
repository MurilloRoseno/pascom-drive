// Todo o texto da pagina de doacao fica aqui, para a paroquia revisar em um so lugar.

export const PARISH = {
  name: 'Paróquia São Rafael',
  city: 'Açailândia',
  whatsappUrl: 'https://wa.me/5599991646063',
  whatsappLabel: '(99) 99164-6063',
  email: 'paroquiasaorafael@hotmail.com',
  hours: 'Terça a sexta, das 8h30 às 11h',
};

export const HERO = {
  kicker: 'Paróquia São Rafael · Açailândia',
  title: 'Sua oferta sustenta a vida da nossa paróquia.',
  lead: 'Com ela a comunidade celebra, evangeliza e cuida de quem precisa. Você escolhe o valor e para onde ele vai.',
  verse: 'Cada um dê conforme decidiu em seu coração. Deus ama quem dá com alegria.',
  verseRef: '2 Coríntios 9,7',
  trust: ['Pagamento seguro pelo Stripe', 'Comprovante por e-mail', 'Destino respeitado'],
};

// As chaves precisam ser as mesmas ids de backend/lib/donations.js.
export const DESTINOS = {
  dizimo: {
    label: 'Dízimo',
    hint: 'Sustento da vida paroquial',
    text: 'Mantém as celebrações, a catequese, a secretaria e o dia a dia da comunidade.',
  },
  obras: {
    label: 'Obras da Matriz',
    hint: 'Cuidado com a igreja',
    text: 'Conservação e melhorias da igreja matriz e dos espaços onde as pastorais se reúnem.',
  },
  'pastoral-social': {
    label: 'Pastoral Social',
    hint: 'Apoio a famílias',
    text: 'Ajuda a famílias em necessidade acompanhadas pela comunidade.',
  },
  'onde-mais-precisar': {
    label: 'Onde mais precisar',
    hint: 'A paróquia decide',
    text: 'A paróquia aplica onde a necessidade for maior no momento.',
  },
};

// Usado apenas ate a configuracao chegar do servidor (ou se ela falhar).
export const FALLBACK_CONFIG = {
  destinos: Object.entries(DESTINOS).map(([id, destino]) => ({ id, label: destino.label })),
  valoresSugeridos: [20, 50, 100, 200],
  limites: { min: 5, max: 10000 },
  tarifas: null,
};

export const FUNDAMENTOS = {
  title: 'Por que a Igreja pede e como ela cuida do que recebe',
  intro: 'Ofertar é um gesto livre de fé e de pertença. A Igreja o reconhece e o protege com normas claras, resumidas abaixo.',
  items: [
    {
      ref: 'Cân. 222 §1',
      title: 'Um dever de quem pertence',
      text: 'Os fiéis têm o dever de ajudar nas necessidades da Igreja, para que não falte o necessário ao culto divino, às obras de apostolado e de caridade e ao sustento digno dos ministros.',
    },
    {
      ref: 'Cân. 1261 §1',
      title: 'Um gesto livre',
      text: 'Os fiéis são livres para destinar bens em favor da Igreja. Você decide quanto e quando ofertar.',
    },
    {
      ref: 'Cân. 1262',
      title: 'Conforme as normas da Igreja',
      text: 'A contribuição dos fiéis responde aos apelos da Igreja e segue as normas da conferência dos bispos.',
    },
    {
      ref: 'Cân. 1267 §3',
      title: 'O destino é respeitado',
      text: 'A oferta feita para uma finalidade determinada só pode ser aplicada a essa finalidade. O destino que você escolhe fica registrado em cada doação.',
    },
    {
      ref: 'Cân. 1287 §2',
      title: 'Prestação de contas',
      text: 'Quem administra deve prestar contas aos fiéis dos bens que eles ofereceram à Igreja, conforme as normas de cada diocese.',
    },
    {
      ref: 'Cân. 537',
      title: 'Administração com os fiéis',
      text: 'Cada paróquia tem um conselho para assuntos econômicos, no qual fiéis ajudam o pároco a administrar os bens da comunidade.',
    },
    {
      ref: 'Intima Ecclesiae natura, art. 10',
      title: 'Cada coleta para a sua finalidade',
      text: 'Cabe ao bispo diocesano garantir que o que foi arrecadado seja destinado às finalidades para as quais foi recolhido.',
    },
  ],
  free: {
    title: 'A oferta é livre',
    text: 'Sua oferta não compra nada: não há produto, serviço nem sacramento em troca. Por isso a doação fica separada da venda de fotos dos eventos.',
  },
  sources: [
    { label: 'Código de Direito Canônico (vatican.va)', href: 'https://www.vatican.va/archive/cod-iuris-canonici/portuguese/codex-iuris-canonici_po.pdf' },
    { label: 'Intima Ecclesiae natura, Bento XVI (vatican.va)', href: 'https://www.vatican.va/content/benedict-xvi/pt/motu_proprio/documents/hf_ben-xvi_motu-proprio_20121111_caritas.html' },
  ],
};

export const STEPS = [
  { title: 'Escolha', text: 'Defina o destino, o valor e se a oferta é única ou mensal.' },
  { title: 'Pague', text: 'Use Pix ou cartão no ambiente seguro do Stripe.' },
  { title: 'Receba', text: 'O comprovante chega por e-mail assim que o pagamento é confirmado.' },
];

export const OTHER_WAYS = [
  { icon: 'envelope', title: 'Envelope do dízimo', text: 'Entregue na missa ou na secretaria paroquial.' },
  { icon: 'basket', title: 'Doação de alimentos', text: 'Combine a entrega com a secretaria.' },
  { icon: 'hands', title: 'Voluntariado', text: 'As pastorais acolhem novos servidores. Procure a secretaria.' },
];

export const FAQ = [
  {
    q: 'É seguro doar por aqui?',
    a: 'Sim. O pagamento acontece no ambiente do Stripe, empresa de pagamentos usada no mundo inteiro. Os dados do seu cartão não passam pelo site da paróquia nem ficam guardados aqui.',
  },
  {
    q: 'Preciso me identificar?',
    a: 'Não. Nome e e-mail são opcionais nesta página. O Stripe pede um e-mail na hora do pagamento apenas para enviar o comprovante.',
  },
  {
    q: 'Recebo comprovante?',
    a: 'Sim. Assim que o pagamento é confirmado, você recebe um e-mail com o valor, o destino e o código da oferta.',
  },
  {
    q: 'Posso escolher para onde vai a minha oferta?',
    a: 'Sim. O destino escolhido fica registrado na doação e é respeitado, como pede o Código de Direito Canônico.',
  },
  {
    q: 'Como cancelo a doação mensal?',
    a: 'Pelo botão "Gerenciar doação mensal" que vai no e-mail de comprovante. O cancelamento é imediato e não exige falar com ninguém.',
  },
  {
    q: 'Quem paga a taxa do pagamento?',
    a: 'O Stripe cobra uma taxa por operação. Você pode marcar a opção de cobri-la para que o valor da oferta chegue inteiro. Se não marcar, a taxa é descontada do que a paróquia recebe.',
  },
  {
    q: 'Doar é o mesmo que comprar fotos?',
    a: 'Não. A venda de fotos dos eventos tem preço e acontece em outra área do site. Aqui a oferta é livre e nada é entregue em troca.',
  },
];
