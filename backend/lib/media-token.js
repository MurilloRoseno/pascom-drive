const { signToken, verifyToken } = require('./jwt-utils');

const MEDIA_TOKEN_TTL_MS = 10 * 60 * 1000;

function secret() {
  return process.env.MEDIA_TOKEN_SECRET || process.env.GALLERY_SESSION_SECRET || process.env.DOWNLOAD_JWT_SECRET || '';
}

// Tokens de administracao so sao emitidos por rotas /api/pascom/* (Clerk + EquipePascom)
// e liberam previas de eventos ainda nao publicados para revisao da equipe.
const ADMIN_MEDIA_TOKEN_TTL_MS = 60 * 60 * 1000;

function issueMediaToken({ eventoId, fotoId, variant, admin = false, now = Date.now() }) {
  const signingSecret = secret();
  if (!signingSecret) throw new Error('Segredo de midia nao configurado.');
  return signToken({
    kind: 'media',
    eventoId,
    fotoId,
    variant: variant === 'thumbnail' ? 'thumbnail' : 'preview',
    ...(admin ? { admin: true } : {}),
    exp: now + (admin ? ADMIN_MEDIA_TOKEN_TTL_MS : MEDIA_TOKEN_TTL_MS),
  }, signingSecret);
}

function mediaTokenAccess(token, { eventoId, fotoId, variant, now = Date.now() }) {
  const denied = { allowed: false, admin: false };
  const signingSecret = secret();
  if (!token || !signingSecret) return denied;
  try {
    const payload = verifyToken(token, signingSecret);
    const allowed = payload.kind === 'media' &&
      payload.eventoId === eventoId &&
      payload.fotoId === fotoId &&
      payload.variant === (variant === 'thumbnail' ? 'thumbnail' : 'preview') &&
      payload.exp > now;
    return allowed ? { allowed: true, admin: payload.admin === true } : denied;
  } catch (_error) {
    return denied;
  }
}

function mediaTokenAllows(token, options) {
  return mediaTokenAccess(token, options).allowed;
}

function appendMediaToken(url, token) {
  const separator = String(url).includes('?') ? '&' : '?';
  return `${url}${separator}mt=${encodeURIComponent(token)}`;
}

module.exports = {
  MEDIA_TOKEN_TTL_MS,
  ADMIN_MEDIA_TOKEN_TTL_MS,
  mediaTokenAccess,
  issueMediaToken,
  mediaTokenAllows,
  appendMediaToken,
};
