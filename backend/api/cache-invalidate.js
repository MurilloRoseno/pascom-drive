const { z } = require('zod');
const { invalidateCacheTags } = require('../lib/runtime-cache');
const { authorizeWorker } = require('../lib/worker-auth');

const schema = z.object({
  eventoId: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
  scopes: z.array(z.enum(['catalogo', 'evento', 'media'])).min(1).default(['catalogo']),
});

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorizeWorker(req, {
    legacyHeader: 'x-cache-invalidation-secret',
    legacySecret: process.env.CACHE_INVALIDATION_SECRET,
  })) {
    return res.status(401).json({ error: 'Nao autorizado.' });
  }

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Escopo de cache invalido.' });

  const { eventoId, scopes } = parsed.data;
  if (scopes.some((scope) => scope !== 'catalogo') && !eventoId) {
    return res.status(400).json({ error: 'eventoId obrigatorio para cache de evento ou midia.' });
  }

  try {
    const tags = scopes.map((scope) => {
      if (scope === 'catalogo') return 'catalogo-eventos';
      return `${scope}-${eventoId}`;
    });
    await invalidateCacheTags(tags);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};
