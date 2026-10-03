const { z } = require('zod');
const { obterAba } = require('./google-sheets');
const { ErroNegocio, validar } = require('./erros');

const ABA = 'Configuracoes';
const CABECALHOS = ['Chave', 'Valor', 'AtualizadoEm', 'Por'];
const CACHE_MS = 30 * 1000;

const numero = (min, max) => z.preprocess(
  (v) => (typeof v === 'string' ? Number(v.trim().replace(',', '.')) : v),
  z.number().finite().min(min).max(max),
);

const booleano = z.preprocess((v) => {
  if (typeof v === 'string') return ['sim', 'true', '1'].includes(v.trim().toLowerCase());
  return v;
}, z.boolean());

const inteiro = (min, max) => numero(min, max).pipe(z.number().int());

const limpar = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v);

// Texto livre que pode ficar em branco ("não mostrar"): em branco é uma escolha, não um defeito.
const textoOpcional = (max) => z.preprocess(limpar, z.string().max(max, `Use no máximo ${max} caracteres.`));

const emailOpcional = z.preprocess(limpar, z.union([z.literal(''), z.string().email('E-mail inválido.').max(120)]));

const httpsOpcional = z.preprocess(
  limpar,
  z.string().max(200).refine((v) => v === '' || /^https:\/\/[^\s]+$/.test(v), 'Comece com https://'),
);

const CORES_DO_SITE = ['#6D2077', '#461356', '#2F6B4B', '#A33F20'];

// Texto livre curto (aparece para o visitante): sem quebra de linha estranha, com limite.
const texto = (max) => z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v),
  z.string().min(1).max(max),
);

// Cada chave aceita pelo painel, com tipo, limites e valor padrão.
const CAMPOS = {
  precoFoto: { schema: numero(0.5, 1000), padrao: 5 },
  prazoPadraoDias: { schema: inteiro(0, 365), padrao: 7 },
  // Padrão ligado: é o comportamento de hoje. Desligar é escolha do admin no painel.
  tarja: { schema: booleano, padrao: true },
  previaLargura: { schema: inteiro(480, 1400), padrao: 900 },
  // Pagamentos. Tarifas iniciais vêm de comparativos públicos: confirmar no Dashboard da Stripe.
  // Assistente do site (busca no FAQ, sem IA generativa).
  assistenteAtivo: { schema: booleano, padrao: true },
  assistenteFonteFaq: { schema: booleano, padrao: true },
  assistenteFonteAgenda: { schema: booleano, padrao: true },
  assistenteFonteEventos: { schema: booleano, padrao: true },
  assistenteForaDoEscopo: {
    schema: texto(300),
    padrao: 'Só consigo ajudar com o site da paróquia: fotos, pagamentos, entregas, agenda e privacidade.',
  },
  // Página inicial: blocos (JSON validado em lib/home.js) e evento em destaque. Só /api/pascom/home grava.
  homeBlocos: { schema: z.string().max(1500), padrao: '' },
  homeDestaque: { schema: z.string().max(80), padrao: '' },
  repassarTaxa: { schema: booleano, padrao: true },
  distribuicaoTaxa: { schema: inteiro(0, 100), padrao: 50 }, // % da taxa que vai em "comodidade"
  tarifaCartaoPct: { schema: numero(0, 20), padrao: 3.99 },
  tarifaCartaoFixo: { schema: numero(0, 10), padrao: 0.39 },
  tarifaPixPct: { schema: numero(0, 20), padrao: 1.19 },
  tarifaPixFixo: { schema: numero(0, 10), padrao: 0 },
  // Só dígitos com DDI (55...), que é como o wa.me funciona. Com só DDD + número, entra o 55.
  whatsapp: {
    schema: z.preprocess((v) => {
      const d = String(v ?? '').replace(/\D/g, '');
      return d.length === 10 || d.length === 11 ? `55${d}` : d;
    }, z.string().regex(/^(\d{12,13})?$/, 'Telefone inválido. Informe DDD e número.')),
    padrao: '',
  },
  // Conteúdo do site (rodapé, contato, redes, cor).
  siteNome: { schema: z.preprocess(limpar, z.string().min(3, 'Informe o nome da paróquia.').max(80)), padrao: 'Paróquia São Rafael' },
  siteCidade: { schema: z.preprocess(limpar, z.string().min(2, 'Informe a cidade e o estado.').max(80)), padrao: 'Açailândia – MA' },
  siteLema: { schema: textoOpcional(120), padrao: '' },
  siteEmail: { schema: emailOpcional, padrao: '' },
  siteEndereco: { schema: textoOpcional(200), padrao: '' },
  siteHorario: { schema: textoOpcional(120), padrao: '' },
  siteInstagram: { schema: httpsOpcional, padrao: '' },
  siteFacebook: { schema: httpsOpcional, padrao: '' },
  siteYoutube: { schema: httpsOpcional, padrao: '' },
  siteVersiculo: { schema: textoOpcional(200), padrao: '' },
  siteReferencia: { schema: textoOpcional(60), padrao: '' },
  siteCor: { schema: z.enum(CORES_DO_SITE, { errorMap: () => ({ message: 'Escolha uma das cores da lista.' }) }), padrao: '#6D2077' },
};

const DEFAULTS = Object.fromEntries(Object.entries(CAMPOS).map(([k, c]) => [k, c.padrao]));

let cache = null;

function limparCache() {
  cache = null;
}

/**
 * Lê as configurações da aba `Configuracoes`, caindo no padrão quando a chave
 * falta ou o valor é inválido. Resultado fica em cache por 30 s.
 * @returns {Promise<typeof DEFAULTS>}
 */
async function lerConfig() {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.valor;
  const aba = await obterAba(ABA, CABECALHOS);
  const rows = await aba.getRows();
  const valor = { ...DEFAULTS };
  for (const row of rows) {
    const chave = row.get('Chave');
    const campo = CAMPOS[chave];
    if (!campo) continue;
    const lido = campo.schema.safeParse(row.get('Valor'));
    if (lido.success) valor[chave] = lido.data;
  }
  cache = { valor, em: Date.now() };
  return valor;
}

/**
 * Grava uma chave (cria a linha se não existir). Quem chama deve registrar
 * na auditoria o valor antigo e o novo.
 * @param {string} chave
 * @param {unknown} bruto
 * @param {string} por e-mail de quem alterou
 */
async function salvarConfig(chave, bruto, por) {
  const campo = CAMPOS[chave];
  if (!campo) throw new ErroNegocio('Chave de configuração inválida');
  const valor = validar(campo.schema, bruto);
  const aba = await obterAba(ABA, CABECALHOS);
  const rows = await aba.getRows();
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const existente = rows.find((r) => r.get('Chave') === chave);
  if (existente) {
    existente.set('Valor', String(valor));
    existente.set('AtualizadoEm', agora);
    existente.set('Por', por);
    await existente.save();
  } else {
    await aba.addRow({ Chave: chave, Valor: String(valor), AtualizadoEm: agora, Por: por });
  }
  limparCache();
  return valor;
}

module.exports = { lerConfig, salvarConfig, limparCache, DEFAULTS, CAMPOS, CORES_DO_SITE };
