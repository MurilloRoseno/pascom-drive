const { lerConfig } = require('./config-store');
const { conteudoDoSite } = require('./conteudo');
const { lerModulos } = require('./modulos');
const { homePublica } = require('./home');

/**
 * O que o visitante pode ver sobre o site: identidade, contato, redes, home, quais módulos estão no
 * ar (com o recado) e o preço/taxas que o checkout vai cobrar (para a vitrine não mostrar valor
 * velho). Nunca leva tarifas do gateway, chaves nem o resto das configurações.
 */
async function lerSitePublico() {
  const [config, modulos, home] = await Promise.all([lerConfig(), lerModulos(), homePublica()]);
  return {
    ...conteudoDoSite(config),
    assistenteAtivo: Boolean(config.assistenteAtivo),
    home,
    modulos: Object.fromEntries(Object.entries(modulos).map(([chave, m]) => [chave, { ligado: m.efetivo, recado: m.recado }])),
    precos: {
      foto: config.precoFoto,
      taxaServico: config.taxaServico,
      taxaComodidade: config.taxaComodidade,
    },
  };
}

module.exports = { lerSitePublico };
