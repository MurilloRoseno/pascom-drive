// Poucas cores para cinco tipos: a cor agrupa, o nome do tipo diz o que é (nunca só a cor).
const COR_DO_TIPO = {
  missa: '#6D2077',
  sacramento: '#8A6A00',
  reuniao: '#2F6F86',
  formacao: '#2F6B4B',
  festa: '#A33F20',
};

export const corDoTipo = (tipo) => COR_DO_TIPO[tipo] || '#5E584E';

/** Fundo bem claro da cor do tipo, para o chip no calendário. */
export const fundoDoTipo = (tipo) => `${corDoTipo(tipo)}1F`;
