const { obterAba } = require('./google-sheets');
const { SEM_RESPOSTA } = require('./sheet-schemas');
const { neutralizarCelula } = require('./sheet-safe');
const { normalizar } = require('./assistente');

const abaSemResposta = () => obterAba(SEM_RESPOSTA.aba, SEM_RESPOSTA.cabecalhos);

/**
 * Esconde sequências de 6+ dígitos (telefone, CPF, cartão) e limita a 200
 * caracteres. Só o texto da pergunta é guardado, nunca quem perguntou.
 */
function mascarar(texto) {
  return String(texto)
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '***.***.***-**')
    .replace(/\d{6,}/g, '***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Anota a pergunta que o assistente não soube responder, para a equipe virar FAQ.
 * Nunca derruba a resposta ao visitante.
 * @returns {Promise<boolean>} true se gravou uma pergunta nova
 */
async function registrarSemResposta(pergunta) {
  try {
    const limpa = mascarar(pergunta);
    if (!limpa) return false;
    const aba = await abaSemResposta();
    const rows = await aba.getRows();
    const chave = normalizar(limpa);
    if (rows.some((r) => r.get('Situacao') === 'Aberta' && normalizar(r.get('Pergunta')) === chave)) return false;
    await aba.addRow({
      Quando: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      Pergunta: neutralizarCelula(limpa),
      Situacao: 'Aberta',
    });
    return true;
  } catch (err) {
    console.error('[sem-resposta] falha ao registrar', err.message);
    return false;
  }
}

/** @param {number} [limite] @returns {Promise<string[]>} abertas, mais novas primeiro */
async function listarSemResposta(limite = 10) {
  const rows = await (await abaSemResposta()).getRows();
  return rows
    .filter((r) => r.get('Situacao') === 'Aberta')
    .map((r) => r.get('Pergunta'))
    .reverse()
    .slice(0, limite);
}

async function resolverSemResposta(pergunta) {
  const chave = normalizar(pergunta);
  const rows = await (await abaSemResposta()).getRows();
  const row = rows.find((r) => r.get('Situacao') === 'Aberta' && normalizar(r.get('Pergunta')) === chave);
  if (!row) return false;
  row.set('Situacao', 'Resolvida');
  await row.save();
  return true;
}

module.exports = { registrarSemResposta, listarSemResposta, resolverSemResposta, mascarar };
