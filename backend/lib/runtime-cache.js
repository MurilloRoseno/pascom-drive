const { getCache, invalidateByTag } = require('@vercel/functions');

const CACHE_NAMESPACE = 'pascom-drive';

function cacheClient() {
  return getCache({ namespace: CACHE_NAMESPACE });
}

function logCache(event, details) {
  console.log(JSON.stringify({ event, ...details, ts: new Date().toISOString() }));
}

async function readThrough(key, loader, { ttl = 300, tags = [], name = key } = {}) {
  const startedAt = Date.now();
  const cache = cacheClient();

  try {
    const cached = await cache.get(key);
    if (cached !== undefined && cached !== null) {
      logCache('runtime_cache_hit', { key: name, elapsedMs: Date.now() - startedAt });
      return { value: cached, source: 'cache_hit' };
    }
  } catch (error) {
    logCache('runtime_cache_read_error', { key: name, message: error.message });
  }

  const value = await loader();
  try {
    await cache.set(key, value, { ttl, tags, name });
  } catch (error) {
    logCache('runtime_cache_write_error', { key: name, message: error.message });
  }
  logCache('runtime_cache_miss', { key: name, elapsedMs: Date.now() - startedAt });
  return { value, source: 'cache_miss' };
}

async function invalidateCacheTags(tags) {
  const unique = [...new Set(tags.filter(Boolean))];
  if (!unique.length) return;

  const results = await Promise.allSettled([
    cacheClient().expireTag(unique),
    invalidateByTag(unique),
  ]);
  const errors = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason.message);

  logCache('runtime_cache_invalidate', { tags: unique, errors });
  if (errors.length === results.length) {
    throw new Error(`Falha ao invalidar cache: ${errors.join('; ')}`);
  }
}

module.exports = { readThrough, invalidateCacheTags };
