const protectedPreviews = [
  ['/assets/previews/preview-01.webp', '/assets/previews/thumb-01.webp'],
  ['/assets/previews/preview-02.webp', '/assets/previews/thumb-02.webp'],
  ['/assets/previews/preview-03.webp', '/assets/previews/thumb-03.webp'],
];

const protectedPhotos = (captions) => captions.map((caption, index) => ({
  id: `foto-0${index + 1}`,
  previewUrl: protectedPreviews[index][0],
  thumbnailUrl: protectedPreviews[index][1],
  watermarkedPreview: true,
  alt: 'Prévia institucional protegida da Paróquia São Rafael',
  caption,
  price: 10,
  availableForSale: false,
}));

const publicPhotos = (captions) => captions.map((caption, index) => ({
  id: `foto-0${index + 1}`,
  previewUrl: `/assets/previews/public-0${index + 1}.webp`,
  thumbnailUrl: `/assets/previews/public-thumb-0${index + 1}.webp`,
  watermarkedPreview: false,
  alt: 'Registro institucional da Paróquia São Rafael',
  caption,
  price: 10,
  availableForSale: false,
}));

export const categories = [
  { id: 'celebracoes', label: 'Celebrações', description: 'Missas solenes, festas patronais e momentos de oração vividos em comunidade.' },
  { id: 'batismo', label: 'Batismo', description: 'Registros do primeiro sacramento e da acolhida de novos membros da Igreja.' },
  { id: 'eucaristia', label: 'Eucaristia', description: 'Celebrações e primeiras comunhões que fortalecem a vida cristã.' },
  { id: 'crisma', label: 'Crisma', description: 'Momentos de confirmação da fé e envio pelo Espírito Santo.' },
  { id: 'casamento', label: 'Casamento', description: 'Celebrações do amor sacramental e da vida em família.' },
  { id: 'uncao-dos-enfermos', label: 'Unção dos Enfermos', description: 'Celebrações de consolo, cuidado e esperança na enfermidade.' },
  { id: 'ordem', label: 'Ordem', description: 'Vocação, ministério e serviço dedicado ao povo de Deus.' },
];

const commonDemo = {
  isDemo: true,
  publication: 'publicado',
  salesAuthorized: false,
  salesStatus: 'preparing',
  provider: null,
  galleryPurchaseUrl: '',
};

export const demoEvents = [
  {
    ...commonDemo,
    eventoId: 'visita-a-paroquia-galeria-publica',
    title: 'Visita à Paróquia - Galeria Pública',
    category: 'celebracoes',
    categoryIds: ['celebracoes'],
    date: '2026-05-25',
    dateLabel: '25 de Maio de 2026',
    monthKey: 'maio-2026',
    time: '10h00',
    location: 'Paróquia São Rafael',
    description: 'Uma demonstração aberta da galeria, apresentando a arquitetura e a presença da paróquia em Açailândia.',
    cover: '/assets/previews/cover-publica.webp',
    visibility: 'publica',
    protectedGallery: false,
    minorProtection: false,
    privacyNote: 'Esta galeria contém somente imagens institucionais da igreja e está aberta para visualização pública.',
    photos: publicPhotos([
      'Vista externa da Paróquia São Rafael.',
      'Detalhe da torre e da cruz da igreja.',
      'Entrada da paróquia e sua arquitetura.',
    ]),
  },
  {
    ...commonDemo,
    eventoId: 'missa-de-pentecostes-2026',
    title: 'Missa de Pentecostes 2026',
    category: 'celebracoes',
    categoryIds: ['celebracoes'],
    date: '2026-05-19',
    dateLabel: '19 de Maio de 2026',
    monthKey: 'maio-2026',
    time: '19h00',
    location: 'Paróquia São Rafael',
    description: 'A comunidade reunida para celebrar a vinda do Espírito Santo e renovar sua missão.',
    cover: '/assets/previews/cover-institucional.webp',
    visibility: 'protegida',
    protectedGallery: true,
    minorProtection: false,
    privacyNote: 'Fotos de participantes ficam reservadas à galeria protegida. Nesta demonstração, exibimos somente prévias institucionais da igreja.',
    photos: protectedPhotos([
      'Prévia institucional preparada para a galeria da Missa de Pentecostes.',
      'A arquitetura da paróquia apresentada em ambiente protegido.',
      'Exemplo de visualização com marca d água antes da compra.',
    ]),
  },
  {
    ...commonDemo,
    eventoId: 'primeira-comunhao-2026',
    title: 'Primeira Comunhão 2026',
    category: 'eucaristia',
    categoryIds: ['eucaristia'],
    date: '2026-06-11',
    dateLabel: '11 de Junho de 2026',
    monthKey: 'junho-2026',
    time: '16h00',
    location: 'Igreja Matriz',
    description: 'Um dia especial de encontro com Cristo na Eucaristia, celebrado pelas famílias e pela paróquia.',
    cover: '/assets/previews/cover-institucional.webp',
    visibility: 'protegida',
    protectedGallery: true,
    minorProtection: true,
    privacyNote: 'Por envolver crianças e famílias, fotos identificáveis somente podem ser vistas em galeria privada com acesso autorizado.',
    photos: protectedPhotos([
      'Prévia institucional segura para a galeria da Primeira Comunhão.',
      'Nenhuma imagem identificável de menores é publicada nesta página.',
      'A futura compra ocorrerá em ambiente protegido e autorizado.',
    ]),
  },
  {
    ...commonDemo,
    eventoId: 'casamento-joao-e-maria',
    title: 'Casamento João & Maria',
    category: 'casamento',
    categoryIds: ['casamento'],
    date: '2026-05-03',
    dateLabel: '03 de Maio de 2026',
    monthKey: 'maio-2026',
    time: '17h00',
    location: 'Capela São José',
    description: 'A celebração da aliança matrimonial diante de Deus, familiares e amigos.',
    cover: '/assets/previews/cover-institucional.webp',
    visibility: 'protegida',
    protectedGallery: true,
    minorProtection: false,
    privacyNote: 'Retratos dos noivos e convidados permanecem reservados à galeria protegida. Aqui são mostradas somente prévias institucionais.',
    photos: protectedPhotos([
      'Prévia institucional da galeria reservada do matrimônio.',
      'Visualização protegida com identidade da Paróquia São Rafael.',
      'A foto final será entregue sem marca após compra confirmada.',
    ]),
  },
];

export const categoryLabel = (id) => categories.find((category) => category.id === id)?.label || 'Celebrações';

export const findDemoEvent = (eventoId) => demoEvents.find((event) => event.eventoId === eventoId);

export function filterDemoEvents({ q = '', categoria = '', data = '' } = {}) {
  const term = q.trim().toLocaleLowerCase('pt-BR');
  return demoEvents.filter((event) => {
    const searchValue = [event.title, event.location, event.dateLabel, categoryLabel(event.category), event.description]
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    return (!term || searchValue.includes(term))
      && (!categoria || event.categoryIds.includes(categoria))
      && (!data || event.monthKey === data);
  });
}
