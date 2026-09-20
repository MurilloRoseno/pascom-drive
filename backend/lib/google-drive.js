// google-drive.js — Drive API v3 via direct REST calls + native crypto.
//
// WHY NOT googleapis/google-auth-library:
//   Both use gtoken → jwa → crypto.createSign().sign(pemString), which triggers
//   `error:1E08010C:DECODER routines::unsupported` on OpenSSL 3 (Node.js 18+/Vercel).
//
// FIX:
//   Use crypto.sign() with a KeyObject (Node.js 15+ API). It pre-loads the key
//   before signing, bypassing the PKCS8 decoder path that OpenSSL 3 rejects.
//   Use native fetch (Node.js 18+) for all HTTP calls — no external HTTP deps.

const crypto = require('crypto');

let _cachedToken = null;
let _tokenExpiry = 0;

/**
 * Parse and normalize the GOOGLE_PRIVATE_KEY env var into a valid PEM string.
 * Handles all common Vercel env var formatting issues:
 *   - Literal \n (escaped) not yet converted to real newlines
 *   - CRLF line endings
 *   - Surrounding double/single quotes (common copy-paste from JSON)
 *   - No line breaks in the base64 body (one long line)
 *
 * Strategy: extract the raw base64 content between PEM markers, strip ALL
 * whitespace, then reformat into standard 64-char lines.
 * This guarantees OpenSSL 3 can parse it regardless of original formatting.
 */
function parsePrivateKey(raw) {
  let key = (raw || '').trim();

  // Strip surrounding quotes if the value was copied including JSON string delimiters
  key = key.replace(/^["']|["']$/g, '');

  // Convert escape sequences → actual characters
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const BEGIN = '-----BEGIN PRIVATE KEY-----';
  const END   = '-----END PRIVATE KEY-----';

  if (!key.includes(BEGIN) || !key.includes(END)) {
    // Log safe diagnostic info (no key content exposed)
    console.error('[drive] Key missing PEM markers. Length:', key.length);
    throw new Error('GOOGLE_PRIVATE_KEY is missing PEM markers (-----BEGIN/END PRIVATE KEY-----)');
  }

  // Extract base64 body, strip ALL whitespace, reformat into 64-char lines
  const start  = key.indexOf(BEGIN) + BEGIN.length;
  const end    = key.indexOf(END);
  const body   = key.slice(start, end).replace(/\s+/g, '');
  const lines  = body.match(/.{1,64}/g) || [];

  return `${BEGIN}\n${lines.join('\n')}\n${END}\n`;
}

/**
 * Exchange a service-account JWT for a Google OAuth2 access token.
 * Token is cached for the duration of its validity (1 hour).
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken;

  const email  = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Mesma convencao da planilha (google-sheets.shared.js): a chave em base64 tem prioridade.
  const encodedKey = process.env.GOOGLE_PRIVATE_KEY_B64;
  const rawKey = parsePrivateKey(encodedKey
    ? Buffer.from(encodedKey, 'base64').toString('utf8')
    : process.env.GOOGLE_PRIVATE_KEY);

  // Build JWT: header + payload
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;

  // crypto.sign() with KeyObject avoids createSign().sign(pemString) OpenSSL 3 issue
  const privateKey = crypto.createPrivateKey(rawKey);
  const signature = crypto.sign('SHA256', Buffer.from(signingInput), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  }).toString('base64url');

  const jwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token via OAuth2 token endpoint
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  _cachedToken = data.access_token;
  _tokenExpiry = now + (data.expires_in || 3600);
  return _cachedToken;
}

/**
 * Download a Drive file as a Buffer.
 * @param {string} fileId
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
async function downloadFile(fileId) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Drive download failed (${res.status}): ${await res.text()}`);
  }
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType };
}

/**
 * Download a Drive HEIC/HEIF file as a JPEG Buffer using Google's thumbnail service.
 * Google Drive generates JPEG previews of HEIC files server-side — we request one
 * at 2400px (sufficient for 1200px max output after watermark resize).
 *
 * WHY: Vercel Lambda runs libheif 2.x which loads HEVC codec via dynamic plugins (.so).
 * Those plugin files don't exist on Lambda's filesystem → "Error while loading plugin (11.6003)".
 * Google's thumbnail service decodes HEIC natively and serves a JPEG.
 *
 * @param {string} fileId
 * @returns {Promise<{buffer: Buffer, mimeType: 'image/jpeg'}>}
 */
async function downloadFileAsJpeg(fileId) {
  const token = await getAccessToken();

  // 1. Get file metadata to obtain the thumbnail URL
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) {
    throw new Error(`Drive metadata failed (${metaRes.status}): ${await metaRes.text()}`);
  }
  const { thumbnailLink } = await metaRes.json();

  if (!thumbnailLink) {
    throw new Error(
      'HEIC thumbnail not yet generated by Google Drive. ' +
      'Retry in a few minutes (Google generates previews asynchronously after upload).'
    );
  }

  // 2. Request thumbnail at 2400px (overrides the default =s220 in the URL)
  const thumbUrl = thumbnailLink.replace(/=s\d+$/, '=s2400');

  // 3. Download the JPEG thumbnail using the same OAuth Bearer token
  const thumbRes = await fetch(thumbUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!thumbRes.ok) {
    throw new Error(`Thumbnail download failed (${thumbRes.status}): ${await thumbRes.text()}`);
  }

  const buffer = Buffer.from(await thumbRes.arrayBuffer());
  return { buffer, mimeType: 'image/jpeg' };
}

/**
 * Upload a Buffer as a new file inside a Drive folder (multipart upload).
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} filename
 * @param {string} folderId
 * @returns {Promise<string>} Shareable link
 */
async function uploadFile(buffer, mimeType, filename, folderId) {
  const token = await getAccessToken();
  const boundary = `boundary_${Date.now()}`;
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return `https://drive.google.com/file/d/${data.id}/view?usp=sharing`;
}

/**
 * Replace the content of an existing Drive file (keeps fileId + sharing settings).
 * Uses Drive v3 multipart PATCH upload.
 * @param {string} fileId
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
async function updateFile(fileId, buffer, mimeType) {
  const token = await getAccessToken();
  const boundary = `boundary_${Date.now()}`;
  const metadata = JSON.stringify({ mimeType });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    throw new Error(`Drive update failed (${res.status}): ${await res.text()}`);
  }
}

module.exports = { downloadFile, downloadFileAsJpeg, uploadFile, updateFile };
