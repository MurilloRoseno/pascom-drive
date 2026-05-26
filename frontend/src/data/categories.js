export const categories = [
  { id: 'celebracoes', label: 'Celebrações' },
  { id: 'batismo', label: 'Batismo' },
  { id: 'eucaristia', label: 'Eucaristia' },
  { id: 'crisma', label: 'Crisma' },
  { id: 'casamento', label: 'Casamento' },
  { id: 'uncao-dos-enfermos', label: 'Unção dos Enfermos' },
  { id: 'ordem', label: 'Ordem' },
];

export const categoryLabel = (id) => categories.find((category) => category.id === id)?.label || 'Celebrações';
