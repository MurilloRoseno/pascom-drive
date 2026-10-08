const WINDOW_MS = 60 * 1000;
const MAX_MEDIA_HITS = 180;
const buckets = new Map();

function mediaAbuseGuard(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const key = `${ip}:${req.params.eventoId || 'evento'}:${req.query.variant === 'thumbnail' ? 'thumbnail' : 'preview'}`;
  const current = buckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + WINDOW_MS };
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > MAX_MEDIA_HITS) {
    console.warn(JSON.stringify({
      event: 'media_abuse_blocked',
      ip,
      eventoId: req.params.eventoId,
      variant: req.query.variant === 'thumbnail' ? 'thumbnail' : 'preview',
      count: bucket.count,
      ts: new Date().toISOString(),
    }));
    return res.status(429).json({ error: 'Muitas requisicoes de imagens. Tente novamente em instantes.' });
  }
  return next();
}

function resetMediaAbuseBuckets() {
  buckets.clear();
}

module.exports = { mediaAbuseGuard, resetMediaAbuseBuckets };
