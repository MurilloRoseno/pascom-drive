const { lerConfig } = require('./config-store');
const { listarCategorias } = require('./categorias');
const { listarFaq } = require('./faq');
const { listarCompromissos } = require('./agenda');
const { lerModulos } = require('./modulos');
const { listarMatriz } = require('./acessos');
const { listarEquipe } = require('./equipe');

/**
 * Cópia das configurações do site num único objeto (JSON para download).
 * Não inclui pedidos, fotos nem chaves: só o que a equipe configura no painel.
 * ATENÇÃO: leva a lista da equipe (e-mails e telefones), por isso só o administrador baixa.
 */
async function montarBackup(agora = new Date()) {
  const [configuracoes, categorias, faq, agenda, modulos, acessos, equipe] = await Promise.all([
    lerConfig(),
    listarCategorias({ incluirOcultas: true }),
    listarFaq(),
    listarCompromissos({ incluirInativos: true }),
    lerModulos(),
    listarMatriz(),
    listarEquipe(),
  ]);
  return {
    geradoEm: agora.toISOString(),
    configuracoes, categorias, faq, agenda, modulos, acessos, equipe,
  };
}

module.exports = { montarBackup };
