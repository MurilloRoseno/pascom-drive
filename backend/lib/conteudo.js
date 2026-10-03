const { z } = require('zod');
const { lerConfig, salvarConfig, CAMPOS } = require('./config-store');
const { ErroNegocio, validar } = require('./erros');

// Conteúdo do site editável pelo painel: identidade, contato, redes e as seções da Home que
// têm texto próprio (missão, números, depoimentos). Nada de dinheiro: preço e tarifas têm
// rota própria, com permissão e reautenticação. Cada campo simples reaproveita o schema da
// sua chave em config-store (limite, formato, sem fórmula de planilha, rede só no domínio certo).
const CAMPOS_SIMPLES = [
  { chave: 'siteNome', publico: 'nome', rotulo: 'Nome' },
  { chave: 'siteCidade', publico: 'cidade', rotulo: 'Cidade' },
  { chave: 'siteLema', publico: 'lema', rotulo: 'Lema' },
  { chave: 'siteEmail', publico: 'email', rotulo: 'E-mail' },
  { chave: 'whatsapp', publico: 'whatsapp', rotulo: 'WhatsApp' },
  { chave: 'siteEndereco', publico: 'endereco', rotulo: 'Endereço' },
  { chave: 'siteHorario', publico: 'horario', rotulo: 'Horário' },
  { chave: 'siteInstagram', publico: 'instagram', rotulo: 'Instagram' },
  { chave: 'siteFacebook', publico: 'facebook', rotulo: 'Facebook' },
  { chave: 'siteYoutube', publico: 'youtube', rotulo: 'YouTube' },
  { chave: 'siteVersiculo', publico: 'versiculo', rotulo: 'Versículo' },
  { chave: 'siteReferencia', publico: 'referencia', rotulo: 'Referência do versículo' },
];

const limpa = (max, min = 1, msg) => z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v),
  z.string().min(min, msg).max(max, `Use no máximo ${max} caracteres.`),
);

const missaoSchema = z.object({
  titulo: limpa(80, 1, 'Dê um título à missão.'),
  paragrafos: z.array(limpa(400, 1, 'Parágrafo vazio.')).min(1, 'Escreva ao menos um parágrafo.').max(3, 'Use no máximo 3 parágrafos.'),
}).strict();

const numerosSchema = z.array(z.object({
  valor: limpa(12, 1, 'Informe o número.'),
  rotulo: limpa(40, 1, 'Informe o que o número conta.'),
}).strict()).max(4, 'Use no máximo 4 números.');

const depoimentosSchema = z.array(z.object({
  autor: limpa(60, 1, 'Informe quem deu o depoimento.'),
  funcao: limpa(60, 0),
  texto: limpa(280, 1, 'Escreva o depoimento.'),
}).strict()).max(6, 'Use no máximo 6 depoimentos.');

const ESTRUTURADOS = {
  missao: { chave: 'homeMissao', rotulo: 'Missão', schema: missaoSchema },
  numeros: { chave: 'homeNumeros', rotulo: 'Números', schema: numerosSchema },
  depoimentos: { chave: 'homeDepoimentos', rotulo: 'Depoimentos', schema: depoimentosSchema },
};

const NOMES_PERMITIDOS = [...CAMPOS_SIMPLES.map((c) => c.publico), ...Object.keys(ESTRUTURADOS)];

/** Lê o JSON gravado sem nunca quebrar: o que não passa na regra vira "vazio". */
function lerJson(texto, schema, vazio) {
  if (!texto) return vazio;
  try {
    const r = schema.safeParse(JSON.parse(texto));
    return r.success ? r.data : vazio;
  } catch {
    return vazio;
  }
}

/** O conteúdo do site como o painel edita e o visitante vê (nada interno). */
function conteudoDoSite(config) {
  const base = Object.fromEntries(CAMPOS_SIMPLES.map((c) => [c.publico, config[c.chave]]));
  return {
    ...base,
    missao: lerJson(config.homeMissao, missaoSchema, null),
    numeros: lerJson(config.homeNumeros, numerosSchema, []),
    depoimentos: lerJson(config.homeDepoimentos, depoimentosSchema, []),
  };
}

function prepararGravacao(nome, valor) {
  const simples = CAMPOS_SIMPLES.find((c) => c.publico === nome);
  if (simples) {
    const gravar = validar(CAMPOS[simples.chave].schema, valor);
    return { chave: simples.chave, rotulo: simples.rotulo, gravar };
  }
  const { chave, rotulo, schema } = ESTRUTURADOS[nome];
  // vazio (null, lista vazia) = limpar a seção
  const vazio = valor === null || (Array.isArray(valor) && valor.length === 0);
  const gravar = vazio ? '' : JSON.stringify(validar(schema, valor));
  return { chave, rotulo, gravar };
}

/**
 * Publica várias alterações de uma vez. Valida tudo primeiro: se algum campo estiver errado,
 * nada é gravado. Só aceita campos do conteúdo do site.
 * @param {Record<string, unknown>} alteracoes campos pelo nome público (nome, email, missao...)
 * @param {string} por e-mail de quem publicou
 * @returns {Promise<{alterados: string[]}>} rótulos dos campos gravados
 */
async function publicarConteudo(alteracoes, por) {
  const nomes = Object.keys(alteracoes || {});
  if (nomes.length === 0) throw new ErroNegocio('Nada para publicar.');
  if (nomes.some((n) => !NOMES_PERMITIDOS.includes(n))) throw new ErroNegocio('Campo não permitido.');

  const preparados = nomes.map((nome) => {
    try {
      return prepararGravacao(nome, alteracoes[nome]);
    } catch (e) {
      const rotulo = (CAMPOS_SIMPLES.find((c) => c.publico === nome) || ESTRUTURADOS[nome]).rotulo;
      throw new ErroNegocio(`${rotulo}: ${e.message}`);
    }
  });
  for (const p of preparados) await salvarConfig(p.chave, p.gravar, por);
  return { alterados: preparados.map((p) => p.rotulo) };
}

/** Conteúdo atual para o painel e para o site. */
async function lerConteudo() {
  return conteudoDoSite(await lerConfig());
}

module.exports = {
  publicarConteudo, lerConteudo, conteudoDoSite, NOMES_PERMITIDOS,
};
