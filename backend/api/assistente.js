const { z } = require('zod');
const { responder } = require('../lib/assistente');
const { listarFaq, valoresDosTokens } = require('../lib/faq');
const { lerConfig } = require('../lib/config-store');
const { listarEventosPublicados } = require('../lib/google-sheets.catalog');
const { registrarSemResposta } = require('../lib/sem-resposta');
const { proximas } = require('../lib/agenda');
const { ErroNegocio, validar } = require('../lib/erros');

const corpoSchema = z.object({ mensagem: z.string().max(1000) }).strict();

/**
 * POST /api/assistente { mensagem }. Responde só com o que a paróquia escreveu (FAQ, agenda,
 * eventos publicados e dentro da janela). Não consulta pedidos nem dados pessoais, não guarda
 * histórico e mostra de onde veio cada resposta.
 */
module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { mensagem } = validar(corpoSchema, req.body);
    const config = await lerConfig();
    if (!config.assistenteAtivo) throw new ErroNegocio('O assistente está desligado no momento.', 503);

    const resultado = await responder({
      mensagem,
      config,
      faq: config.assistenteFonteFaq ? await listarFaq({ apenasPublicadas: true }) : [],
      valores: valoresDosTokens(config),
      eventosNoAr: async () => (await listarEventosPublicados()).map((e) => e.title),
      agenda: () => proximas(5),
    });

    if (resultado.registrar) await registrarSemResposta(mensagem);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      tipo: resultado.tipo,
      resposta: resultado.resposta,
      fonte: resultado.fonte,
      relacionadas: resultado.relacionadas || [],
    });
  } catch (err) {
    return next(err);
  }
};
