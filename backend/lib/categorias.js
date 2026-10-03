const { obterAba } = require('./google-sheets');
const { CATEGORIAS } = require('./sheet-schemas');
const { neutralizarCelula } = require('./sheet-safe');
const { ErroNegocio } = require('./erros');

const CATEGORIA_PADRAO = 'celebracoes';
const TIPOS = ['sacramento', 'celebracao'];

const INICIAIS = [
  { id: 'celebracoes', nome: 'Celebrações', tipo: 'celebracao' },
  { id: 'batismo', nome: 'Batismo', tipo: 'sacramento' },
  { id: 'eucaristia', nome: 'Eucaristia', tipo: 'sacramento' },
  { id: 'crisma', nome: 'Crisma', tipo: 'sacramento' },
  { id: 'casamento', nome: 'Casamento', tipo: 'sacramento' },
  { id: 'uncao-dos-enfermos', nome: 'Unção dos Enfermos', tipo: 'sacramento' },
  { id: 'ordem', nome: 'Ordem', tipo: 'sacramento' },
];

/** 'Profissão de Fé' -> 'profissao-de-fe' */
function slugify(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const abaCategorias = () => obterAba(CATEGORIAS.aba, CATEGORIAS.cabecalhos);

function paraObjeto(row, contagem) {
  const id = row.get('Id');
  return {
    id,
    nome: row.get('Nome'),
    tipo: row.get('Tipo'),
    ordem: Number(row.get('Ordem')) || 0,
    ativo: String(row.get('Ativo')).toUpperCase() === 'SIM',
    padrao: id === CATEGORIA_PADRAO,
    eventos: contagem ? (contagem[id] || 0) : 0,
  };
}

async function contarEventosPorCategoria() {
  const aba = await obterAba('Eventos', []) // só leitura: sem cabeçalhos pedidos, a aba real não é alterada;
  const rows = await aba.getRows();
  const contagem = {};
  for (const r of rows) {
    const c = String(r.get('Categoria') || '').trim() || CATEGORIA_PADRAO;
    contagem[c] = (contagem[c] || 0) + 1;
  }
  return contagem;
}

/** Lê as linhas; na primeira vez (aba vazia) grava as categorias iniciais. */
async function lerLinhas() {
  const aba = await abaCategorias();
  let rows = await aba.getRows();
  if (rows.length === 0) {
    for (const [i, c] of INICIAIS.entries()) {
      await aba.addRow({ Id: c.id, Nome: c.nome, Tipo: c.tipo, Ordem: String(i + 1), Ativo: 'SIM' });
    }
    rows = await aba.getRows();
  }
  return { aba, rows };
}

const removida = (row) => String(row.get('Ativo')).toUpperCase() === 'REMOVIDA';

/**
 * @param {{incluirOcultas?: boolean}} [opcoes]
 * @returns {Promise<{id: string, nome: string, tipo: string, ordem: number, ativo: boolean, padrao: boolean, eventos: number}[]>}
 */
async function listarCategorias({ incluirOcultas = false } = {}) {
  const { rows } = await lerLinhas();
  const contagem = await contarEventosPorCategoria();
  return rows
    .filter((r) => !removida(r))
    .map((r) => paraObjeto(r, contagem))
    .filter((c) => incluirOcultas || c.ativo)
    .sort((a, b) => a.ordem - b.ordem);
}

/** Ids que aceitam eventos novos (ativas). */
async function slugsAtivos() {
  return (await listarCategorias()).map((c) => c.id);
}

function validarNome(nome) {
  const limpo = String(nome || '').trim();
  if (limpo.length < 2) throw new ErroNegocio('Informe o nome da categoria.');
  if (limpo.length > 60) throw new ErroNegocio('O nome da categoria é longo demais.');
  return limpo;
}

async function criarCategoria({ nome, tipo }) {
  const limpo = validarNome(nome);
  if (!TIPOS.includes(tipo)) throw new ErroNegocio('Tipo inválido');
  const base = slugify(limpo);
  if (!base) throw new ErroNegocio('Informe o nome da categoria.');

  const { aba, rows } = await lerLinhas();
  const vivas = rows.filter((r) => !removida(r));
  if (vivas.some((r) => r.get('Id') === base)) throw new ErroNegocio('Essa categoria já existe.');

  const usados = new Set(rows.map((r) => r.get('Id')));
  let id = base;
  for (let n = 2; usados.has(id); n += 1) id = `${base}-${n}`;

  const ordem = rows.reduce((m, r) => Math.max(m, Number(r.get('Ordem')) || 0), 0) + 1;
  await aba.addRow({ Id: id, Nome: neutralizarCelula(limpo), Tipo: tipo, Ordem: String(ordem), Ativo: 'SIM' });
  return { id, nome: limpo, tipo, ordem, ativo: true, padrao: false, eventos: 0 };
}

async function acharLinha(id) {
  const { rows } = await lerLinhas();
  const row = rows.find((r) => r.get('Id') === id && !removida(r));
  if (!row) throw new ErroNegocio('Categoria não encontrada.', 404);
  return { row, rows };
}

/** @param {string} id @param {{nome?: string, ativo?: boolean}} patch */
async function atualizarCategoria(id, patch) {
  const { row } = await acharLinha(id);
  if (patch.nome !== undefined) row.set('Nome', neutralizarCelula(validarNome(patch.nome)));
  if (patch.ativo !== undefined) {
    if (id === CATEGORIA_PADRAO && !patch.ativo) throw new ErroNegocio('A categoria padrão não pode ser ocultada.');
    row.set('Ativo', patch.ativo ? 'SIM' : 'NAO');
  }
  await row.save();
  return paraObjeto(row);
}

/** Troca a ordem com a vizinha do mesmo tipo. @param {'subir'|'descer'} direcao */
async function moverCategoria(id, direcao) {
  const { row, rows } = await acharLinha(id);
  const tipo = row.get('Tipo');
  const irmas = rows
    .filter((r) => r.get('Tipo') === tipo && !removida(r))
    .sort((a, b) => Number(a.get('Ordem')) - Number(b.get('Ordem')));
  const i = irmas.indexOf(row);
  const vizinha = irmas[direcao === 'subir' ? i - 1 : i + 1];
  if (!vizinha) return false;
  const minha = row.get('Ordem');
  row.set('Ordem', vizinha.get('Ordem'));
  vizinha.set('Ordem', minha);
  await row.save();
  await vizinha.save();
  return true;
}

/**
 * Com eventos, só oculta (os eventos continuam apontando para ela). Sem eventos,
 * marca como REMOVIDA: a linha fica na planilha como histórico.
 */
async function removerCategoria(id) {
  if (id === CATEGORIA_PADRAO) throw new ErroNegocio('A categoria padrão não pode ser removida.');
  const { row } = await acharLinha(id);
  const contagem = await contarEventosPorCategoria();
  if ((contagem[id] || 0) > 0) {
    row.set('Ativo', 'NAO');
    await row.save();
    return { resultado: 'ocultada' };
  }
  row.set('Ativo', 'REMOVIDA');
  await row.save();
  return { resultado: 'removida' };
}

module.exports = {
  slugify, listarCategorias, slugsAtivos, criarCategoria, atualizarCategoria,
  moverCategoria, removerCategoria, CATEGORIA_PADRAO, TIPOS,
};
