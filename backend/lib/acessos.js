const { obterAba } = require('./google-sheets');
const { ACESSOS } = require('./sheet-schemas');
const {
  PAPEIS, definirMatriz, normalizarPermissoes, permissoesDoPapel,
} = require('./permissions');
const { ErroNegocio } = require('./erros');

const CACHE_MS = 30 * 1000;
let carregadoEm = 0;

const abaAcessos = () => obterAba(ACESSOS.aba, ACESSOS.cabecalhos);

function limparCacheMatriz() {
  carregadoEm = 0;
}

/**
 * Carrega a matriz salva na planilha (com cache de 30 s) e a aplica. Se a planilha
 * falhar, o painel segue com a matriz já carregada ou com o padrão: nunca trava todo
 * mundo por causa disso.
 */
async function garantirMatriz() {
  if (Date.now() - carregadoEm < CACHE_MS) return;
  try {
    const rows = await (await abaAcessos()).getRows();
    const matriz = {};
    for (const r of rows) {
      const papel = String(r.get('Papel') || '').trim();
      matriz[papel] = String(r.get('Permissoes') || '').split(',').map((p) => p.trim()).filter(Boolean);
    }
    definirMatriz(matriz);
    carregadoEm = Date.now();
  } catch (err) {
    console.error('[acessos] falha ao carregar a matriz; usando a anterior/padrão', err.message);
  }
}

/** Permissões efetivas de cada papel (salvas ou padrão). @returns {Promise<Record<string, string[]>>} */
async function listarMatriz() {
  await garantirMatriz();
  return Object.fromEntries(PAPEIS.map((p) => [p, permissoesDoPapel(p)]));
}

/**
 * Salva o que o papel pode fazer. O admin é fixo; as permissões reservadas a ele
 * nunca são concedidas; criar/editar/excluir trazem o "ver".
 * @param {string} papel
 * @param {string[]} permissoes
 * @param {string} por e-mail de quem alterou
 */
async function salvarAcesso(papel, permissoes, por) {
  if (papel === 'admin') throw new ErroNegocio('O administrador sempre tem todas as permissões.');
  if (!PAPEIS.includes(papel)) throw new ErroNegocio('Papel desconhecido.');
  const lista = normalizarPermissoes(permissoes);
  const aba = await abaAcessos();
  const rows = await aba.getRows();
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const existente = rows.find((r) => r.get('Papel') === papel);
  if (existente) {
    existente.set('Permissoes', lista.join(','));
    existente.set('AtualizadoEm', agora);
    existente.set('Por', por);
    await existente.save();
  } else {
    await aba.addRow({ Papel: papel, Permissoes: lista.join(','), AtualizadoEm: agora, Por: por });
  }
  limparCacheMatriz();
  await garantirMatriz();
  return lista;
}

module.exports = {
  garantirMatriz, listarMatriz, salvarAcesso, limparCacheMatriz,
};
