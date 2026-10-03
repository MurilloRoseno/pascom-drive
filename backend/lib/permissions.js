/**
 * Áreas do painel e as ações que cada uma aceita. A matriz abaixo vale como
 * padrão; a tela Acessos (fase 5) poderá sobrescrevê-la a partir da planilha.
 */
const AREAS = [
  { chave: 'eventos', rotulo: 'Eventos e publicação', acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'envio', rotulo: 'Envio de fotos', acoes: ['ver', 'criar'] },
  { chave: 'pedidos', rotulo: 'Pedidos', acoes: ['ver', 'editar'] },
  { chave: 'agenda', rotulo: 'Agenda', acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'categorias', rotulo: 'Categorias', acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'ajuda', rotulo: 'Central de ajuda', acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'conteudo', rotulo: 'Conteúdo e página inicial', acoes: ['ver', 'editar'] },
  { chave: 'pagamentos', rotulo: 'Pagamentos e taxas', acoes: ['ver', 'editar'] },
  { chave: 'seguranca', rotulo: 'Segurança e tarja', acoes: ['ver', 'editar'] },
  { chave: 'modulos', rotulo: 'Módulos', acoes: ['gerenciar'] },
  { chave: 'acessos', rotulo: 'Acessos', acoes: ['gerenciar'] },
];

const PAPEIS = ['admin', 'coord', 'foto', 'atend'];

const todas = AREAS.flatMap((a) => a.acoes.map((acao) => `${a.chave}.${acao}`));

const PADRAO = {
  admin: new Set(todas),
  coord: new Set(todas.filter((p) => !['pagamentos.editar', 'seguranca.editar', 'modulos.gerenciar', 'acessos.gerenciar'].includes(p))),
  foto: new Set(['eventos.ver', 'eventos.criar', 'eventos.editar', 'envio.ver', 'envio.criar']),
  atend: new Set([
    'pedidos.ver', 'pedidos.editar', 'eventos.ver',
    'agenda.ver', 'agenda.criar', 'agenda.editar',
    'ajuda.ver', 'ajuda.criar', 'ajuda.editar',
  ]),
};

// Só o administrador gerencia módulos e acessos: nenhuma matriz salva consegue conceder.
const PROTEGIDAS = ['modulos.gerenciar', 'acessos.gerenciar'];

/**
 * Deixa a lista coerente: só permissões que existem e não são reservadas ao admin;
 * criar, editar ou excluir sempre trazem o "ver" da mesma área.
 * @param {string[]} lista
 * @returns {string[]} sem repetição, na ordem canônica
 */
function normalizarPermissoes(lista) {
  const pedidas = new Set((Array.isArray(lista) ? lista : []).filter((p) => todas.includes(p) && !PROTEGIDAS.includes(p)));
  for (const p of [...pedidas]) pedidas.add(`${p.split('.')[0]}.ver`);
  return todas.filter((p) => pedidas.has(p) && !PROTEGIDAS.includes(p));
}

// Matriz salva no painel (aba Acessos). Vale sobre o padrão, exceto para o admin.
let personalizada = {};

/**
 * @param {Record<string, string[]>|null} matriz papel -> permissões (null volta ao padrão)
 */
function definirMatriz(matriz) {
  personalizada = {};
  if (!matriz) return;
  for (const [papel, lista] of Object.entries(matriz)) {
    if (papel !== 'admin' && PAPEIS.includes(papel)) personalizada[papel] = new Set(normalizarPermissoes(lista));
  }
}

function conjuntoDo(papel) {
  if (!Object.prototype.hasOwnProperty.call(PADRAO, papel)) return null;
  if (papel !== 'admin' && Object.prototype.hasOwnProperty.call(personalizada, papel)) return personalizada[papel];
  return PADRAO[papel];
}

/**
 * @param {string|undefined} papel
 * @param {string|undefined} permissao formato `area.acao`
 * @returns {boolean} false para qualquer papel ou permissão desconhecidos
 */
function temPermissao(papel, permissao) {
  if (typeof papel !== 'string' || typeof permissao !== 'string') return false;
  const conjunto = conjuntoDo(papel);
  return conjunto ? conjunto.has(permissao) : false;
}

/** @param {string} papel */
function permissoesDoPapel(papel) {
  const conjunto = conjuntoDo(papel);
  return conjunto ? [...conjunto] : [];
}

module.exports = {
  AREAS, PAPEIS, PROTEGIDAS, temPermissao, permissoesDoPapel, definirMatriz, normalizarPermissoes,
};
