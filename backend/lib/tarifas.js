const { gatewayAtivo } = require('./gateway');
const { listarRegrasPagamento } = require('./google-sheets.catalog');

// config-store é carregado só quando precisa: ele depende de google-sheets, que por sua vez
// carrega commercial-rules (e este módulo). Pedir no topo fecharia um círculo de importações.
const configuracao = () => require('./config-store').lerConfig();

/** Preço da foto e taxas fixas em vigor (aba Configuracoes, editada no painel). */
async function precosBase() {
  const config = await configuracao();
  return {
    unitPrice: config.precoFoto,
    serviceFee: config.taxaServico,
    convenienceFee: config.taxaComodidade,
  };
}

/**
 * Tarifa estimada de cada meio de pagamento, repassada ao comprador por cima do valor.
 * Com a Stripe, vem de Configuracoes (confira no Dashboard da Stripe); com o Mercado Pago
 * (legado), segue a aba RegrasPagamento.
 * @returns {Promise<{method: string, percentage: number, fixed: number}[]>}
 */
async function regrasPagamento() {
  if (gatewayAtivo() !== 'stripe') return listarRegrasPagamento();
  const config = await configuracao();
  return [
    { method: 'pix', percentage: config.tarifaPixPct, fixed: config.tarifaPixFixo },
    { method: 'credit_card', percentage: config.tarifaCartaoPct, fixed: config.tarifaCartaoFixo },
  ];
}

module.exports = { precosBase, regrasPagamento };
