const crypto = require('crypto');
const { signToken, verifyToken } = require('./jwt-utils');

function getSecret() {
  return process.env.GALLERY_SESSION_SECRET || process.env.DOWNLOAD_JWT_SECRET || '';
}

function hashCode(code) {
  const salt = process.env.GALLERY_CODE_SALT || '';
  return crypto.createHash('sha256').update(`${String(code).trim().toUpperCase()}${salt}`).digest('hex');
}

function verifyCode(code, expectedHash) {
  if (!code || !expectedHash) return false;
  const actual = hashCode(code);
  return actual.length === expectedHash.length &&
    crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expectedHash));
}

function issueGalleryToken(event) {
  const secret = getSecret();
  if (!secret) throw new Error('Segredo de galeria nao configurado.');
  return signToken({
    kind: 'gallery',
    eventoId: event.eventoId,
    version: event.codeVersion,
    exp: Date.now() + 60 * 60 * 1000,
  }, secret);
}

function tokenAllowsEvent(token, event) {
  if (event.visibility === 'publica') return true;
  if (!token || !getSecret()) return false;
  try {
    const payload = verifyToken(token, getSecret());
    return payload.kind === 'gallery' &&
      payload.eventoId === event.eventoId &&
      payload.version === event.codeVersion &&
      payload.exp > Date.now();
  } catch (_error) {
    return false;
  }
}

module.exports = { hashCode, verifyCode, issueGalleryToken, tokenAllowsEvent };
