/**
 * Erro com mensagem escrita para a pessoa que usa o painel. Só estes erros têm a
 * mensagem devolvida ao navegador; qualquer outro (planilha, rede, bug) vira
 * "erro interno" sem detalhe.
 */
class ErroNegocio extends Error {
  /**
   * @param {string} mensagem
   * @param {number} [status]
   */
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.name = 'ErroNegocio';
    this.status = status;
  }
}

// Mensagens padrão do Zod vêm em inglês; só as que nós escrevemos (em português) chegam à tela.
const MENSAGEM_PADRAO_DO_ZOD = /^(Invalid|Required|Expected|String must|Number must|Array must|Unrecognized|Too )/;

/**
 * Valida com Zod e, se falhar, lança ErroNegocio (400) com a mensagem em português da
 * primeira regra violada, ou "Dados inválidos" quando a regra não tinha mensagem nossa.
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {unknown} dados
 * @returns {T}
 */
function validar(schema, dados) {
  const r = schema.safeParse(dados);
  if (r.success) return r.data;
  const msg = r.error.issues[0] && r.error.issues[0].message;
  throw new ErroNegocio(msg && !MENSAGEM_PADRAO_DO_ZOD.test(msg) ? msg : 'Dados inválidos');
}

module.exports = { ErroNegocio, validar };
