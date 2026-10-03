const { z } = require('zod');
const { lerConfig, salvarConfig } = require('./config-store');
const { listarEventosAdmin } = require('./eventos-admin');
const { lerModulos } = require('./modulos');
const { conteudoDoSite } = require('./conteudo');
const { ErroNegocio, validar } = require('./erros');

// Blocos da página inicial, na ordem padrão (a de hoje). O topo (busca) é fixo; daqui para baixo
// cada bloco pode mudar de lugar, de título e ser desligado. Cada um depende de um módulo: com o
// módulo fora do ar o bloco some sozinho e volta, no mesmo lugar, quando religado.
// `so` diz em que plataforma o bloco existe (os outros ignoram o que não é deles).
const BLOCOS = [
  { id: 'categorias', titulo: 'Sacramentos e celebrações', modulo: 'busca' },
  { id: 'destaque', titulo: 'Em destaque', modulo: 'busca' },
  { id: 'eventos', titulo: 'Eventos recentes', modulo: 'busca' },
  { id: 'missao', titulo: 'Nossa missão', modulo: null, so: 'desktop' },
  { id: 'agenda', titulo: 'Próximas atividades', modulo: 'agenda' },
  { id: 'depoimentos', titulo: 'O que dizem nossos fiéis', modulo: null, so: 'desktop' },
  { id: 'contato', titulo: 'Fale com a secretaria', modulo: null, so: 'mobile' },
];
const IDS = BLOCOS.map((b) => b.id);
const BLOCOS_PADRAO = BLOCOS.map(({ id, titulo }) => ({ id, titulo, ligado: true }));

const limpar = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v);

const blocoSchema = z.object({
  id: z.string().refine((v) => IDS.includes(v)),
  titulo: z.preprocess(limpar, z.string().min(1, 'Cada bloco precisa de um título.').max(80, 'O título pode ter até 80 caracteres.')),
  ligado: z.boolean(),
}).strict();

const homeSchema = z.object({
  blocos: z.array(blocoSchema).length(IDS.length).refine(
    (lista) => new Set(lista.map((b) => b.id)).size === IDS.length,
    'Dados inválidos',
  ),
  destaque: z.string().max(80),
}).strict();

/**
 * Lê o que está salvo, sem nunca derrubar o site: JSON quebrado, id desconhecido ou
 * repetido são ignorados, e o que faltar entra no fim com o padrão.
 * @param {string} bruto JSON salvo em Configuracoes
 */
function interpretarBlocos(bruto) {
  let salvo = [];
  try {
    const lido = JSON.parse(bruto || '[]');
    if (Array.isArray(lido)) salvo = lido;
  } catch {
    return BLOCOS_PADRAO.map((b) => ({ ...b }));
  }
  const vistos = new Set();
  const validos = [];
  for (const item of salvo) {
    const r = blocoSchema.safeParse(item);
    if (r.success && !vistos.has(r.data.id)) {
      vistos.add(r.data.id);
      validos.push(r.data);
    }
  }
  return [...validos, ...BLOCOS_PADRAO.filter((b) => !vistos.has(b.id)).map((b) => ({ ...b }))];
}

async function lerHome() {
  const config = await lerConfig();
  return { blocos: interpretarBlocos(config.homeBlocos), destaque: config.homeDestaque || '' };
}

/**
 * Valida o que veio do painel. O destaque só pode ser um evento que está no ar.
 * @param {unknown} entrada
 */
async function validarHome(entrada) {
  const dados = validar(homeSchema, entrada);
  if (dados.destaque) {
    const eventos = await listarEventosAdmin();
    if (!eventos.some((e) => e.eventoId === dados.destaque && e.estado === 'no_ar')) {
      throw new ErroNegocio('Escolha um evento que esteja no ar.');
    }
  }
  return dados;
}

async function salvarHome(entrada, por) {
  const dados = await validarHome(entrada);
  await salvarConfig('homeBlocos', JSON.stringify(dados.blocos), por);
  await salvarConfig('homeDestaque', dados.destaque, por);
  return dados;
}

/**
 * A home como o visitante a vê: só blocos ligados, com módulo no ar, com conteúdo (depoimentos
 * vazios não aparecem) e destaque válido (evento ainda no ar).
 */
async function homePublica() {
  const [config, modulos, eventos] = await Promise.all([lerConfig(), lerModulos(), listarEventosAdmin()]);
  const { blocos, destaque } = { blocos: interpretarBlocos(config.homeBlocos), destaque: config.homeDestaque || '' };
  const conteudo = conteudoDoSite(config);
  const noAr = eventos.find((e) => e.eventoId === destaque && e.estado === 'no_ar');
  const destaqueValido = noAr ? { eventoId: noAr.eventoId, nome: noAr.nome } : null;

  const visiveis = blocos.filter((b) => {
    const { modulo } = BLOCOS.find((x) => x.id === b.id);
    if (!b.ligado) return false;
    if (modulo && modulos[modulo] && !modulos[modulo].efetivo) return false;
    if (b.id === 'destaque' && !destaqueValido) return false;
    if (b.id === 'depoimentos' && conteudo.depoimentos.length === 0) return false;
    return true;
  });
  return { blocos: visiveis.map(({ id, titulo }) => ({ id, titulo })), destaque: destaqueValido };
}

module.exports = {
  BLOCOS, BLOCOS_PADRAO, interpretarBlocos, validarHome, salvarHome, lerHome, homePublica,
};
