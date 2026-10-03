const { z } = require('zod');
const { obterAba } = require('./google-sheets');
const { MODULOS: ESQUEMA } = require('./sheet-schemas');
const { neutralizarCelula } = require('./sheet-safe');
const { ErroNegocio, validar } = require('./erros');

// Partes do site que o administrador pode tirar do ar. O que NUNCA sai: a página
// inicial, o acompanhamento e o download de pedidos já pagos, o webhook de pagamento,
// o painel e o login da equipe.
const MODULOS = [
  { chave: 'busca', nome: 'Busca e galerias', grupo: 'Fotos', dependeDe: null, descricao: 'Galerias, filtros por categoria e a página inicial das fotos.' },
  { chave: 'checkout', nome: 'Compra de fotos', grupo: 'Fotos', dependeDe: 'busca', descricao: 'Carrinho, cotação e pagamento.' },
  { chave: 'agenda', nome: 'Agenda paroquial', grupo: 'Comunidade', dependeDe: null, descricao: 'Calendário público de missas e celebrações.' },
  { chave: 'ajuda', nome: 'Central de ajuda', grupo: 'Atendimento', dependeDe: null, descricao: 'Perguntas frequentes e o assistente.' },
];

const RECADO_PADRAO = 'Esta área está em manutenção. Volte em breve.';
const CACHE_MS = 30 * 1000;
const FALHA_MS = 10 * 1000;
let cache = null;

const abaModulos = () => obterAba(ESQUEMA.aba, ESQUEMA.cabecalhos);
const nomeDe = (chave) => MODULOS.find((m) => m.chave === chave).nome;

function limparCacheModulos() {
  cache = null;
}

/** Tudo ligado: usado quando a planilha não responde (a venda não para por isso). */
function tudoLigado() {
  return Object.fromEntries(MODULOS.map((m) => [m.chave, { ligado: true, efetivo: true, recado: RECADO_PADRAO }]));
}

/**
 * Estado de cada módulo. `ligado` é a chave do próprio módulo; `efetivo` também
 * leva em conta a dependência (sem Busca, a Compra cai junto, com `caiCom`).
 * @returns {Promise<Record<string, {ligado: boolean, efetivo: boolean, recado: string, caiCom?: string}>>}
 */
async function lerModulos() {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.valor;
  let salvo = {};
  try {
    const rows = await (await abaModulos()).getRows();
    salvo = Object.fromEntries(rows.map((r) => [String(r.get('Chave') || '').trim(), r]));
  } catch (err) {
    console.error('[modulos] falha ao ler a planilha; tudo ligado', err.message);
    // respiro curto: com a planilha fora do ar, cada pedido não espera uma nova tentativa
    cache = { valor: tudoLigado(), em: Date.now() - CACHE_MS + FALHA_MS };
    return cache.valor;
  }

  const valor = {};
  for (const m of MODULOS) {
    const row = salvo[m.chave];
    const ligado = !row || String(row.get('Ligado') || '').trim().toUpperCase() !== 'NAO';
    const recado = (row && String(row.get('Recado') || '').trim()) || RECADO_PADRAO;
    const pai = m.dependeDe ? valor[m.dependeDe] : null;
    valor[m.chave] = {
      ligado,
      efetivo: ligado && (!pai || pai.efetivo),
      recado,
      ...(pai && !pai.efetivo ? { caiCom: nomeDe(m.dependeDe) } : {}),
    };
  }
  cache = { valor, em: Date.now() };
  return valor;
}

async function moduloEfetivo(chave) {
  const m = (await lerModulos())[chave];
  return m ? m.efetivo : true;
}

const patchSchema = z.object({
  ligado: z.boolean().optional(),
  recado: z.string().max(200, 'O recado pode ter até 200 caracteres.').optional(),
}).strict();

/**
 * @param {string} chave
 * @param {{ligado?: boolean, recado?: string}} entrada
 * @param {string} por
 */
async function salvarModulo(chave, entrada, por) {
  if (!MODULOS.some((m) => m.chave === chave)) throw new ErroNegocio('Módulo desconhecido.');
  const patch = validar(patchSchema, entrada);
  const aba = await abaModulos();
  const rows = await aba.getRows();
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  let row = rows.find((r) => String(r.get('Chave')).trim() === chave);
  if (!row) {
    row = await aba.addRow({ Chave: chave, Ligado: 'SIM', Recado: '', AtualizadoEm: agora, Por: por });
  }
  if (patch.ligado !== undefined) row.set('Ligado', patch.ligado ? 'SIM' : 'NAO');
  if (patch.recado !== undefined) row.set('Recado', neutralizarCelula(patch.recado.replace(/\s+/g, ' ').trim()));
  row.set('AtualizadoEm', agora);
  row.set('Por', por);
  await row.save();
  limparCacheModulos();
  return (await lerModulos())[chave];
}

/** Nomes dos módulos que caem junto quando `chave` é desligado. */
const derrubadosPor = (chave) => MODULOS.filter((m) => m.dependeDe === chave).map((m) => m.nome);

module.exports = {
  MODULOS, RECADO_PADRAO, lerModulos, moduloEfetivo, salvarModulo, derrubadosPor, limparCacheModulos,
};
