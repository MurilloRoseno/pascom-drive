const { aplicarTokens } = require('./faq');
const { ErroNegocio } = require('./erros');

// Assistente do site SEM IA generativa: procura a resposta no que a paróquia
// escreveu (Central de ajuda, agenda e eventos publicados). Não inventa nada: se
// não achar, diz que não sabe e encaminha para a secretaria.

const TEXTO_BLOQUEIO = 'Não posso fazer isso. Posso explicar como comprar, pagar e baixar as suas fotos, tirar dúvidas sobre prazos e falar da agenda.';
const TEXTO_DADOS_SENSIVEIS = 'Por segurança, nunca digite número de cartão, CPF ou senha aqui. O pagamento é feito só na tela de pagamento, direto na página segura do meio de pagamento.';
const TEXTO_SEM_FONTES = 'Não tenho acesso a essa informação agora.';

const PARADAS = new Set([
  'qual', 'quais', 'quanto', 'quantos', 'quantas', 'quando', 'como', 'para', 'por', 'uma', 'uns', 'umas', 'com', 'que',
  'das', 'dos', 'nao', 'mas', 'mais', 'posso', 'pode', 'podem', 'consigo', 'faco', 'fazer', 'tem', 'ter', 'seu', 'sua',
  'meu', 'minha', 'esta', 'esse', 'essa', 'isso', 'tambem', 'onde', 'sobre', 'ainda', 'muito', 'favor', 'ola', 'bom',
  'dia', 'tarde', 'noite', 'voce', 'voces', 'ela', 'ele', 'nos', 'foi', 'sao', 'estao', 'estou', 'tenho', 'quero', 'gostaria',
  'preciso', 'ajuda', 'queria', 'vou', 'vai', 'cada', 'tudo', 'sem', 'aqui', 'ali', 'entao',
  'aceita', 'aceitam', 'aceito',
]);

// Formas diferentes da mesma ideia viram uma só antes de comparar ("pago", "paguei" e "pagamento"
// com "pagar"). Lista curta e só do que as pessoas realmente perguntam sobre este site.
const SINONIMOS = {
  preco: 'custa', precos: 'custa', valor: 'custa', valores: 'custa', custo: 'custa', custar: 'custa',
  pago: 'pagar', paga: 'pagar', paguei: 'pagar', pagou: 'pagar', pagando: 'pagar', pagamento: 'pagar', pagamentos: 'pagar',
  baixo: 'baixar', baixei: 'baixar', baixa: 'baixar', download: 'baixar', downloads: 'baixar', baixando: 'baixar',
  chegou: 'chegar', chegaram: 'chegar', chegam: 'chegar', chega: 'chegar', recebi: 'chegar',
  vale: 'expirar', validade: 'expirar', vence: 'expirar', venceu: 'expirar', expira: 'expirar', expirou: 'expirar', expirado: 'expirar', expirar: 'expirar',
};

/** Minúsculas, sem acento nem pontuação. */
function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Raiz grosseira: tira o "s" do plural e corta em 5 letras (compro/compra/comprar -> compr). */
function radical(palavra) {
  const p = palavra.length > 3 && palavra.endsWith('s') ? palavra.slice(0, -1) : palavra;
  return p.slice(0, 5);
}

function radicais(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p.length >= 3 && !PARADAS.has(p))
    .map((p) => radical(SINONIMOS[p] || p));
}

const BLOQUEADOS = [
  /ignor\w* .*(regra|instruc|anterior|prompt)/,
  /esquec\w* .*(regra|instruc|anterior)/,
  /\b(finja|finjo|aja como|haja como)\b/,
  /(a partir de agora|agora) voce (e|eh|sera|vai ser)/,
  /\b(prompt|system prompt)\b|instrucoes (do sistema|internas)/,
  /\b(senha|token|api ?key|credencia\w*|segredo)\b|chave (secreta|de api|da api|privada)/,
  /codigo (de|do|da) .*(evento|admin|acesso|painel)/,
];

/** @returns {'bloqueado'|'dados'|'ok'} */
function classificar(mensagem) {
  const bruto = String(mensagem);
  if (/(?:\d[ -]?){13,19}/.test(bruto) || /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(bruto)) return 'dados';
  const n = normalizar(bruto);
  return BLOQUEADOS.some((re) => re.test(n)) ? 'bloqueado' : 'ok';
}

/**
 * Procura a pergunta da FAQ mais parecida. Aceita só quando a maior parte das
 * palavras da consulta aparece (e pelo menos uma na pergunta, ou duas na resposta).
 */
function buscarNoFaq(consulta, faq) {
  const q = [...new Set(radicais(consulta))];
  if (q.length === 0) return { melhor: null, parecidas: [] };

  const avaliadas = faq.filter((f) => f.publicada).map((f) => {
    const naPergunta = new Set(radicais(f.pergunta));
    const naResposta = new Set(radicais(`${f.resposta} ${f.passos.join(' ')}`));
    let pontos = 0;
    let cobertas = 0;
    for (const r of q) {
      if (naPergunta.has(r)) { pontos += 3; cobertas += 1; } else if (naResposta.has(r)) { pontos += 1; cobertas += 1; }
    }
    return { faq: f, pontos, cobertura: cobertas / q.length };
  }).sort((a, b) => b.pontos - a.pontos);

  // Entre as que cobrem boa parte da pergunta, vale a de mais pontos; a de mais pontos que
  // cobre pouco (acertou "link" e "download" mas errou o assunto) não pode esconder a certa.
  const aceitas = avaliadas.filter((a) => a.cobertura >= 0.6 && a.pontos >= 2);
  const topo = aceitas[0] || null;
  return {
    melhor: topo ? topo.faq : null,
    pontos: avaliadas[0] ? avaliadas[0].pontos : 0,
    parecidas: avaliadas.filter((a) => a.pontos > 0 && (!topo || a.faq.id !== topo.faq.id)).slice(0, 2).map((a) => ({ id: a.faq.id, pergunta: a.faq.pergunta })),
  };
}

const quer = (n, re) => re.test(n);
const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function respostaDaFaq(f, valores) {
  const passos = f.passos.length ? `\n\nPasso a passo:\n${f.passos.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : '';
  return aplicarTokens(f.resposta, valores) + passos;
}

/**
 * @param {{
 *   mensagem: string,
 *   config: {assistenteForaDoEscopo: string, assistenteFonteFaq: boolean, assistenteFonteAgenda: boolean, assistenteFonteEventos: boolean},
 *   faq: object[], valores: ReturnType<typeof import('./faq').valoresDosTokens>,
 *   eventosNoAr: () => Promise<string[]>, agenda: () => Promise<{titulo: string, data: string, hora: string, local: string}[]>
 * }} entrada
 * @returns {Promise<{tipo: string, resposta: string, fonte: string, relacionadas?: object[], registrar?: boolean}>}
 */
async function responder({ mensagem, config, faq, valores, eventosNoAr, agenda }) {
  const texto = typeof mensagem === 'string' ? mensagem.trim() : '';
  if (texto.length < 2 || texto.length > 300) throw new ErroNegocio('Escreva uma pergunta de 2 a 300 letras.');

  const tipo = classificar(texto);
  if (tipo === 'bloqueado') return { tipo, resposta: TEXTO_BLOQUEIO, fonte: 'Bloqueado · regra de segurança' };
  if (tipo === 'dados') return { tipo, resposta: TEXTO_DADOS_SENSIVEIS, fonte: 'Segurança' };

  const { assistenteFonteFaq: usaFaq, assistenteFonteAgenda: usaAgenda, assistenteFonteEventos: usaEventos } = config;
  if (!usaFaq && !usaAgenda && !usaEventos) return { tipo: 'sem-fontes', resposta: TEXTO_SEM_FONTES, fonte: 'Sem fontes ligadas' };

  let parecidas = [];
  if (usaFaq) {
    const r = buscarNoFaq(texto, faq);
    if (r.melhor) {
      return { tipo: 'faq', resposta: respostaDaFaq(r.melhor, valores), fonte: `FAQ · ${r.melhor.pergunta}`, relacionadas: r.parecidas };
    }
    parecidas = r.parecidas;
  }

  const n = normalizar(texto);
  if (usaAgenda && quer(n, /\b(missa|missas|agenda|horario|horarios|proxim\w*|celebracao|celebracoes|compromisso\w*)\b/)) {
    const itens = (await agenda()).slice(0, 5);
    const lista = itens.map((i) => `• ${i.titulo} — ${dataCurta(i.data)}${i.hora ? ` às ${i.hora}` : ''}${i.local ? ` (${i.local})` : ''}`);
    return {
      tipo: 'agenda',
      resposta: itens.length ? `Próximos compromissos da paróquia:\n${lista.join('\n')}` : 'Não há compromissos marcados na agenda por enquanto.',
      fonte: 'Agenda paroquial',
    };
  }

  if (usaEventos && quer(n, /\b(evento|eventos|galeria|galerias)\b/)) {
    const nomes = (await eventosNoAr()).slice(0, 10);
    return {
      tipo: 'eventos',
      resposta: nomes.length ? `Eventos com fotos no ar agora: ${nomes.join(', ')}. Escolha na página inicial.` : 'Não há galerias no ar agora.',
      fonte: 'Eventos publicados',
    };
  }

  return { tipo: 'fora', resposta: config.assistenteForaDoEscopo, fonte: 'Fora do escopo', relacionadas: parecidas, registrar: true };
}

module.exports = {
  normalizar, radicais, classificar, buscarNoFaq, responder, TEXTO_BLOQUEIO, TEXTO_DADOS_SENSIVEIS,
};
