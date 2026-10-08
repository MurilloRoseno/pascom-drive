const { signToken, verifyToken } = require('./jwt-utils');

const MEDIA_TOKEN_TTL_MS = 10 * 60 * 1000;

function secret() {
  return process.env.MEDIA_TOKEN_SECRET || process.env.GALLERY_SESSION_SECRET || process.env.DOWNLOAD_JWT_SECRET || '';
}

function issueMediaToken({ eventoId, fotoId, variant, now = Date.now() }) {
  const signingSecret = secret();
  if (!signingSecret) throw new Error('Segredo de midia nao configurado.');
  return signToken({
    kind: 'media',
    eventoId,
    fotoId,
    variant: variant === 'thumbnail' ? 'thumbnail' : 'preview',
    exp: now + MEDIA_TOKEN_TTL_MS,
  }, signingSecret);
}

function mediaTokenAllows(token, { eventoId, fotoId, variant, now = Date.now() }) {
  const signingSecret = secret();
  if (!token || !signingSecret) return false;
  try {
    const payload = verifyToken(token, signingSecret);
    return payload.kind === 'media' &&
      payload.eventoId === eventoId &&
      payload.fotoId === fotoId &&
      payload.variant === (variant === 'thumbnail' ? 'thumbnail' : 'preview') &&
      payload.exp > now;
  } catch (_error) {
    return false;
  }
}

function appendMediaToken(url, token) {
  const separator = String(url).includes('?') ? '&' : '?';
  return `${url}${separator}mt=${encodeURIComponent(token)}`;
}

module.exports = {
  MEDIA_TOKEN_TTL_MS,
  issueMediaToken,
  mediaTokenAllows,
  appendMediaToken,
};
