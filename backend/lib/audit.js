const { obterAba } = require('./google-sheets');
const { neutralizarCelula } = require('./sheet-safe');

const ABA = 'AuditoriaPascom';
const CABECALHOS = ['Quando', 'Quem', 'Mensagem'];

/**
 * Anota uma alteração feita no painel (só acrescenta, nunca edita linha).
 * Falha na planilha é registrada no log e não derruba a operação principal.
 * @param {{quem: string, mensagem: string}} entrada
 * @returns {Promise<boolean>} true se gravou
 */
async function registrarAuditoria({ quem, mensagem }) {
  try {
    const aba = await obterAba(ABA, CABECALHOS);
    await aba.addRow({
      Quando: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      Quem: neutralizarCelula(quem),
      Mensagem: neutralizarCelula(mensagem),
    });
    return true;
  } catch (err) {
    console.error('[audit] falha ao registrar', err.message);
    return false;
  }
}

/**
 * @param {number} [limite]
 * @returns {Promise<{quando: string, quem: string, mensagem: string}[]>} mais nova primeiro
 */
async function ultimasAlteracoes(limite = 6) {
  const aba = await obterAba(ABA, CABECALHOS);
  const rows = await aba.getRows();
  return rows
    .slice(-limite)
    .reverse()
    .map((r) => ({ quando: r.get('Quando'), quem: r.get('Quem'), mensagem: r.get('Mensagem') }));
}

module.exports = { registrarAuditoria, ultimasAlteracoes };
