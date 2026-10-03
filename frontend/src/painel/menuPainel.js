/**
 * Fonte única do menu do painel: rota, textos do cabeçalho e permissão exigida.
 * Cada fase acrescenta aqui a sua tela; o servidor volta a checar a permissão
 * em toda rota, então esconder o item é só conforto.
 *
 * @typedef {{
 *   chave: string,
 *   rota: string,
 *   rotulo: string,
 *   eyebrow: string,
 *   titulo: string,
 *   subtitulo: string,
 *   permissao: string|null,
 *   grupo?: string,
 * }} ItemMenu
 */

/** @type {ItemMenu[]} */
export const MENU = [
  {
    chave: 'visao',
    rota: '/painel',
    rotulo: 'Visão geral',
    eyebrow: 'Painel administrativo',
    titulo: 'Visão geral',
    subtitulo: 'O que aconteceu nos últimos dias e o que pede a sua atenção.',
    permissao: null,
  },
  {
    chave: 'eventos',
    rota: '/painel/eventos',
    rotulo: 'Eventos',
    eyebrow: 'Fotos',
    titulo: 'Eventos e publicação',
    subtitulo: 'Agende a entrada no ar e defina por quanto tempo cada galeria fica disponível.',
    permissao: 'eventos.ver',
  },
  {
    chave: 'categorias',
    rota: '/painel/categorias',
    rotulo: 'Categorias',
    eyebrow: 'Catálogo',
    titulo: 'Sacramentos e celebrações',
    subtitulo: 'A lista que o site usa para organizar os eventos. Novo tipo sem mexer no código.',
    permissao: 'categorias.ver',
  },
  {
    chave: 'pagamentos',
    rota: '/painel/pagamentos',
    rotulo: 'Pagamentos',
    eyebrow: 'Financeiro',
    titulo: 'Pagamentos e taxas',
    subtitulo: 'Preço da foto, repasse da taxa do Stripe e o que o comprador paga em cada caso.',
    permissao: 'pagamentos.ver',
  },
  {
    chave: 'acessos',
    rota: '/painel/acessos',
    rotulo: 'Acessos',
    eyebrow: 'Site inteiro',
    titulo: 'Acessos e equipe',
    subtitulo: 'Quem entra no painel e o que cada papel pode ver e fazer.',
    permissao: 'acessos.gerenciar',
  },
  {
    chave: 'seguranca',
    rota: '/painel/seguranca',
    rotulo: 'Segurança',
    eyebrow: 'Proteção',
    titulo: 'Segurança',
    subtitulo: 'Marca d’água das prévias e como o pagamento é protegido.',
    permissao: 'seguranca.ver',
  },
];

/**
 * @param {string[]} permissoes lista `area.acao` devolvida por /api/pascom/me
 * @param {ItemMenu[]} [menu]
 * @returns {ItemMenu[]}
 */
export function menuVisivel(permissoes, menu = MENU) {
  const liberadas = new Set(permissoes || []);
  return menu.filter((item) => item.permissao === null || liberadas.has(item.permissao));
}

/**
 * Item que corresponde ao caminho atual (o de rota mais longa que casa).
 * @param {string} caminho
 * @param {ItemMenu[]} [menu]
 * @returns {ItemMenu|undefined}
 */
export function itemDaRota(caminho, menu = MENU) {
  const limpo = caminho.replace(/\/+$/, '') || '/';
  return [...menu]
    .sort((a, b) => b.rota.length - a.rota.length)
    .find((i) => limpo === i.rota || limpo.startsWith(`${i.rota}/`));
}
