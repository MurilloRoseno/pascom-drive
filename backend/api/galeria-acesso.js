const { acessoGaleriaSchema } = require('../lib/validation');
const { buscarEvento } = require('../lib/google-sheets');
const { verifyCode, issueGalleryToken } = require('../lib/gallery-access');

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, noimageindex');
  const result = acessoGaleriaSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Codigo invalido.' });
  try {
    const event = await buscarEvento(req.params.eventoId);
    if (!event || event.publication !== 'publicado' || event.visibility !== 'protegida') {
      return res.status(404).json({ error: 'Galeria protegida nao encontrada.' });
    }
    if (!verifyCode(result.data.code, event.codeHash)) {
      return res.status(401).json({ error: 'Codigo de acesso incorreto.' });
    }
    return res.json({ token: issueGalleryToken(event), expiresIn: 3600 });
  } catch (error) {
    next(error);
  }
};
