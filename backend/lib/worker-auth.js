const crypto = require('crypto');

const WINDOW_MS = 5 * 60 * 1000;

function bodyForSignature(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (req.body === undefined) return '';
  return JSON.stringify(req.body);
}

function requestPath(req) {
  return String(req.originalUrl || req.url || '').split('?')[0];
}

function timingSafeStringEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function expectedSignature({ timestamp, method, path, body, secret }) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${String(method || '').toUpperCase()}.${path}.${body}`)
    .digest('hex');
}

function logWorkerAuthFailure(req, reason) {
  console.warn(JSON.stringify({
    event: 'worker_signature_invalid',
    severity: 'warning',
    reason,
    path: requestPath(req),
    method: req.method,
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    ts: new Date().toISOString(),
  }));
}

function legacyAllowed() {
  return process.env.ALLOW_LEGACY_WORKER_SECRET === 'true';
}

function verifyLegacy(req, { legacyHeader, legacySecret }) {
  if (!legacyAllowed() || !legacyHeader || !legacySecret) return false;
  return timingSafeStringEqual(req.headers[legacyHeader], legacySecret);
}

function authorizeWorker(req, { legacyHeader, legacySecret } = {}) {
  const secret = process.env.APPS_SCRIPT_HMAC_SECRET;
  const timestamp = String(req.headers['x-pascom-timestamp'] || '');
  const signature = String(req.headers['x-pascom-signature'] || '');

  if (secret && timestamp && signature) {
    const timestampMs = Number(timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > WINDOW_MS) {
      logWorkerAuthFailure(req, 'timestamp_outside_window');
      return false;
    }
    const expected = expectedSignature({
      timestamp,
      method: req.method,
      path: requestPath(req),
      body: bodyForSignature(req),
      secret,
    });
    if (timingSafeStringEqual(signature, expected)) return true;
    logWorkerAuthFailure(req, 'signature_mismatch');
    return false;
  }

  if (verifyLegacy(req, { legacyHeader, legacySecret })) return true;

  logWorkerAuthFailure(req, secret ? 'missing_signature' : 'missing_secret');
  return false;
}

module.exports = {
  WINDOW_MS,
  authorizeWorker,
  bodyForSignature,
  expectedSignature,
  requestPath,
  timingSafeStringEqual,
};
