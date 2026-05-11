const { listarFotos } = require('../lib/google-sheets');

const ALLOWED_ORIGINS = [
  'https://pascom-drive.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isAllowedOrigin(req) {
  const ref = req.headers.referer || req.headers.origin || '';
  return ALLOWED_ORIGINS.some(o => ref.startsWith(o));
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAllowedOrigin(req)) {
    console.warn(JSON.stringify({
      event: 'unauthorized_origin',
      ip: req.ip || req.headers['x-forwarded-for'],
      referer: req.headers.referer || req.headers.origin || '',
      timestamp: new Date().toISOString(),
    }));
    return res.status(403).json({ error: 'Origem não autorizada' });
  }
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, noimageindex');
  try {
    const fotos = await listarFotos();
    res.json(fotos);
  } catch (err) {
    next(err);
  }
};
