const { listarFaq, aplicarTokens, valoresDosTokens, TEMAS } = require('../lib/faq');
const { lerConfig } = require('../lib/config-store');

/**
 * GET /api/faq: Central de Ajuda pública. Só perguntas publicadas, com os {tokens} de preço,
 * taxas e prazo já trocados. Devolve também o WhatsApp da secretaria (canal secundário) e se
 * o assistente está ligado. Do resto da configuração, nada sai daqui.
 */
module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [config, lista] = await Promise.all([lerConfig(), listarFaq({ apenasPublicadas: true })]);
    const valores = valoresDosTokens(config);
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({
      temas: TEMAS,
      perguntas: lista.map((f) => ({
        id: f.id,
        tema: f.tema,
        pergunta: f.pergunta,
        resposta: aplicarTokens(f.resposta, valores),
        passos: f.passos,
        imagem: f.imagem,
        imagemLegenda: f.imagemLegenda,
        video: f.video,
        videoTitulo: f.videoTitulo,
      })),
      whatsapp: config.whatsapp,
      assistenteAtivo: config.assistenteAtivo,
    });
  } catch (err) {
    return next(err);
  }
};
