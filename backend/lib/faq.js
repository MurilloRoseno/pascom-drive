const crypto = require('crypto');
const { z } = require('zod');
const { obterAba } = require('./google-sheets');
const { FAQ } = require('./sheet-schemas');
const { neutralizarCelula } = require('./sheet-safe');
const { ErroNegocio, validar } = require('./erros');
const { VALIDADE_HORAS, USOS_MAXIMOS } = require('./regras-entrega');

const TEMAS = [
  { id: 'comprar', nome: 'Comprar fotos' },
  { id: 'localizar', nome: 'Encontrar fotos' },
  { id: 'pagar', nome: 'Pagamento' },
  { id: 'receber', nome: 'Receber e baixar' },
  { id: 'prazo', nome: 'Prazos' },
  { id: 'problemas', nome: 'Problemas' },
  { id: 'privacidade', nome: 'Privacidade' },
];
const IDS_TEMA = TEMAS.map((t) => t.id);

// Textos iniciais. Os {tokens} (preço, taxas, prazo e usos do link) são trocados na hora de
// mostrar, então a resposta nunca fica desatualizada quando o painel mudar um valor. Só
// afirmam o que o sistema faz hoje. A de privacidade entra como rascunho: precisa ser
// revisada por quem responde pela paróquia antes de ir ao ar.
const INICIAIS = [
  { tema: 'comprar', pergunta: 'Como compro uma foto?', publicada: true, resposta: 'Escolha as fotos na galeria, finalize a compra, informe seu nome, e-mail e WhatsApp e pague com Pix ou cartão. Depois que o pagamento é confirmado, os links para baixar chegam por e-mail.', passos: ['Encontre o evento na galeria', 'Toque nas fotos que quer comprar', 'Toque em Finalizar compra', 'Informe nome, e-mail e WhatsApp', 'Confira o valor e escolha Pix ou cartão', 'Pague e abra os links que chegam no seu e-mail'] },
  { tema: 'comprar', pergunta: 'Quanto custa cada foto?', publicada: true, resposta: 'Cada foto custa {preco}. Por pedido, somam-se a taxa de serviço ({taxaServico}), a taxa de comodidade ({taxaComodidade}) e o custo do meio de pagamento (que muda entre Pix e cartão). Antes de pagar você vê cada valor e o total.' },
  { tema: 'localizar', pergunta: 'Como encontro as fotos da celebração?', publicada: true, resposta: 'Na página inicial, escolha o tipo de celebração (Batismo, Crisma, Casamento...) e depois o evento. Cada galeria fica no ar por um prazo definido pela Pascom.' },
  { tema: 'pagar', pergunta: 'Posso pagar com Pix ou cartão? Quais as formas de pagamento?', publicada: true, resposta: 'Sim: Pix e cartão de crédito à vista. O pagamento é feito na página segura do meio de pagamento, que abre ao tocar em pagar. A cobrança fica disponível por 30 minutos; passado esse tempo, é só refazer o pedido.' },
  { tema: 'pagar', pergunta: 'O pagamento é seguro?', publicada: true, resposta: 'Os dados do cartão são digitados na página do próprio meio de pagamento e nunca passam pelo nosso servidor. Só liberamos as fotos depois que o meio de pagamento confirma o valor do pedido.' },
  { tema: 'receber', pergunta: 'Como recebo e baixo minhas fotos?', publicada: true, resposta: 'Assim que o pagamento é confirmado, os links de download chegam no e-mail informado na compra. A secretaria também pode enviar pelo WhatsApp que você informou.', passos: ['Pague com Pix ou cartão', 'Abra o e-mail do pedido (olhe também o spam)', 'Toque no link de cada foto para baixar'] },
  { tema: 'receber', pergunta: 'As fotos têm marca d’água?', publicada: true, resposta: 'As prévias da galeria têm uma tarja. A foto que você compra vem em alta qualidade, sem a tarja. Cada arquivo baixado leva uma marca invisível que identifica o pedido, para proteger o trabalho da equipe.' },
  { tema: 'prazo', pergunta: 'Por quanto tempo posso baixar as fotos que comprei?', publicada: true, resposta: 'Cada link vale por {validade} horas e pode ser aberto até {usos} vezes. Depois disso, peça novos links em Recuperar pedido.' },
  { tema: 'prazo', pergunta: 'Meu link de download expirou. E agora?', publicada: true, resposta: 'Cada link vale por {validade} horas e abre até {usos} vezes. Passado o prazo, use a página Recuperar pedido: informe o e-mail da compra e o código do pedido (começa com PED_). Se o pagamento estiver confirmado, geramos novos links. Se não tiver o código, fale com a secretaria.' },
  { tema: 'prazo', pergunta: 'A galeria sumiu. O que aconteceu?', publicada: true, resposta: 'Cada galeria fica no ar por um prazo definido pela Pascom e depois sai da busca, e não é mais possível comprar dela. Quem já pagou recupera os links em Recuperar pedido.' },
  { tema: 'problemas', pergunta: 'Paguei e as fotos não chegaram.', publicada: true, resposta: 'Confira a caixa de entrada e o spam do e-mail informado na compra; no Pix, a confirmação pode levar alguns instantes. Se não chegar, fale com a secretaria informando o código do pedido.' },
  { tema: 'problemas', pergunta: 'Meu pagamento foi recusado.', publicada: true, resposta: 'Confira os dados do cartão ou escolha o Pix. Quando o pagamento não é concluído, nada é cobrado e as fotos não são liberadas.' },
  { tema: 'privacidade', pergunta: 'Que dados vocês guardam sobre mim?', publicada: false, resposta: 'Pedimos nome, e-mail e WhatsApp apenas para identificar o pedido e entregar as fotos. [Revisar com quem responde pela paróquia antes de publicar.]' },
];

const https = z.string().max(500).refine((v) => v === '' || /^https:\/\/[^\s]+$/.test(v), 'O link precisa começar com https://');
const textoCurto = (max) => z.string().max(max);
const passos = z.array(z.string().min(1).max(300)).max(10);

const camposComuns = {
  tema: z.enum(IDS_TEMA),
  pergunta: z.string().min(5, 'Escreva a pergunta.').max(200),
  resposta: textoCurto(4000),
  passos,
  imagem: https,
  imagemLegenda: textoCurto(150),
  video: https,
  videoTitulo: textoCurto(150),
};

const criarSchema = z.object({
  tema: camposComuns.tema,
  pergunta: camposComuns.pergunta,
  resposta: camposComuns.resposta.optional(),
  passos: camposComuns.passos.optional(),
  imagem: camposComuns.imagem.optional(),
  imagemLegenda: camposComuns.imagemLegenda.optional(),
  video: camposComuns.video.optional(),
  videoTitulo: camposComuns.videoTitulo.optional(),
}).strict();

const patchSchema = z.object({
  tema: camposComuns.tema.optional(),
  pergunta: camposComuns.pergunta.optional(),
  resposta: camposComuns.resposta.optional(),
  passos: camposComuns.passos.optional(),
  imagem: camposComuns.imagem.optional(),
  imagemLegenda: camposComuns.imagemLegenda.optional(),
  video: camposComuns.video.optional(),
  videoTitulo: camposComuns.videoTitulo.optional(),
  publicada: z.boolean().optional(),
}).strict();

const abaFaq = () => obterAba(FAQ.aba, FAQ.cabecalhos);
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const limpa = (s) => neutralizarCelula(String(s ?? '').replace(/\s+/g, ' ').trim());
const excluida = (row) => String(row.get('Publicada')).toUpperCase() === 'EXCLUIDA';

function paraObjeto(row) {
  return {
    id: row.get('Id'),
    tema: row.get('Tema'),
    pergunta: row.get('Pergunta'),
    resposta: row.get('Resposta') || '',
    passos: String(row.get('Passos') || '').split('\n').filter(Boolean),
    imagem: row.get('Imagem') || '',
    imagemLegenda: row.get('ImagemLegenda') || '',
    video: row.get('Video') || '',
    videoTitulo: row.get('VideoTitulo') || '',
    publicada: String(row.get('Publicada')).toUpperCase() === 'SIM',
    ordem: Number(row.get('Ordem')) || 0,
  };
}

function novaLinha(dados, ordem, publicada) {
  return {
    Id: `faq_${crypto.randomUUID().slice(0, 8)}`,
    Tema: dados.tema,
    Pergunta: limpa(dados.pergunta),
    Resposta: neutralizarCelula(String(dados.resposta ?? '').trim()),
    Passos: (dados.passos || []).map(limpa).join('\n'),
    Imagem: dados.imagem || '',
    ImagemLegenda: limpa(dados.imagemLegenda),
    Video: dados.video || '',
    VideoTitulo: limpa(dados.videoTitulo),
    Publicada: publicada ? 'SIM' : 'NAO',
    Ordem: String(ordem),
    AtualizadoEm: agora(),
  };
}

async function lerLinhas() {
  const aba = await abaFaq();
  let rows = await aba.getRows();
  if (rows.length === 0) {
    for (const [i, f] of INICIAIS.entries()) await aba.addRow(novaLinha(f, i + 1, f.publicada));
    rows = await aba.getRows();
  }
  return { aba, rows };
}

/**
 * @param {{apenasPublicadas?: boolean}} [opcoes]
 */
async function listarFaq({ apenasPublicadas = false } = {}) {
  const { rows } = await lerLinhas();
  return rows
    .filter((r) => !excluida(r))
    .map(paraObjeto)
    .filter((f) => !apenasPublicadas || f.publicada)
    .sort((a, b) => a.ordem - b.ordem);
}

/** @param {unknown} entrada */
async function criarFaq(entrada) {
  const dados = validar(criarSchema, entrada);
  const { aba, rows } = await lerLinhas();
  const ordem = rows.reduce((m, r) => Math.max(m, Number(r.get('Ordem')) || 0), 0) + 1;
  const linha = novaLinha(dados, ordem, false);
  const criada = await aba.addRow(linha);
  return paraObjeto(criada);
}

async function acharLinha(id) {
  const { rows } = await lerLinhas();
  const row = rows.find((r) => r.get('Id') === id && !excluida(r));
  if (!row) throw new ErroNegocio('Pergunta não encontrada.', 404);
  return row;
}

/** @param {string} id @param {unknown} entrada */
async function atualizarFaq(id, entrada) {
  const patch = validar(patchSchema, entrada);
  const row = await acharLinha(id);

  const novaResposta = patch.resposta !== undefined ? patch.resposta.trim() : String(row.get('Resposta') || '').trim();
  const vaiPublicar = patch.publicada !== undefined ? patch.publicada : String(row.get('Publicada')).toUpperCase() === 'SIM';
  if (vaiPublicar && novaResposta.length < 10) throw new ErroNegocio('Escreva a resposta antes de publicar.');

  if (patch.tema !== undefined) row.set('Tema', patch.tema);
  if (patch.pergunta !== undefined) row.set('Pergunta', limpa(patch.pergunta));
  if (patch.resposta !== undefined) row.set('Resposta', neutralizarCelula(novaResposta));
  if (patch.passos !== undefined) row.set('Passos', patch.passos.map(limpa).join('\n'));
  if (patch.imagem !== undefined) row.set('Imagem', patch.imagem);
  if (patch.imagemLegenda !== undefined) row.set('ImagemLegenda', limpa(patch.imagemLegenda));
  if (patch.video !== undefined) row.set('Video', patch.video);
  if (patch.videoTitulo !== undefined) row.set('VideoTitulo', limpa(patch.videoTitulo));
  if (patch.publicada !== undefined) row.set('Publicada', patch.publicada ? 'SIM' : 'NAO');
  row.set('AtualizadoEm', agora());
  await row.save();
  return paraObjeto(row);
}

/** Marca como excluída: a linha fica na planilha como histórico. */
async function excluirFaq(id) {
  const row = await acharLinha(id);
  row.set('Publicada', 'EXCLUIDA');
  row.set('AtualizadoEm', agora());
  await row.save();
}

const reais = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

/**
 * Troca os {tokens} pelos valores atuais.
 * @param {string} texto
 * @param {{precoFoto: number, taxaServico: number, taxaComodidade: number, validadeHoras: number, usosMaximos: number}} valores
 */
function aplicarTokens(texto, valores) {
  const trocas = {
    '{preco}': reais(valores.precoFoto),
    '{taxaServico}': reais(valores.taxaServico),
    '{taxaComodidade}': reais(valores.taxaComodidade),
    '{validade}': String(valores.validadeHoras),
    '{usos}': String(valores.usosMaximos),
  };
  return Object.entries(trocas).reduce((s, [token, valor]) => s.split(token).join(valor), String(texto));
}

/** Valores que as respostas citam, vindos da configuração do painel e das regras de entrega. */
function valoresDosTokens(config) {
  return {
    precoFoto: config.precoFoto,
    taxaServico: config.taxaServico,
    taxaComodidade: config.taxaComodidade,
    validadeHoras: VALIDADE_HORAS,
    usosMaximos: USOS_MAXIMOS,
  };
}

module.exports = {
  TEMAS, listarFaq, criarFaq, atualizarFaq, excluirFaq, aplicarTokens, valoresDosTokens,
};
