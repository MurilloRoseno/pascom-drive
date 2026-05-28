// Security.js - assinatura HMAC para chamadas Apps Script -> backend.

function bytesToHex(bytes) {
  return bytes.map(function(byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function hmacSha256Hex(message, secret) {
  if (typeof Utilities !== 'undefined' && Utilities.computeHmacSha256Signature) {
    return bytesToHex(Utilities.computeHmacSha256Signature(message, secret));
  }
  if (typeof require !== 'undefined') {
    return require('crypto').createHmac('sha256', secret).update(message).digest('hex');
  }
  throw new Error('HMAC indisponivel no ambiente atual.');
}

function criarHeadersBackendInterno(path, payload, options) {
  var opts = options || {};
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('APPS_SCRIPT_HMAC_SECRET');
  var headers = { 'Content-Type': 'application/json' };

  if (secret) {
    var timestamp = String(Date.now());
    headers['x-pascom-timestamp'] = timestamp;
    headers['x-pascom-signature'] = hmacSha256Hex(
      timestamp + '.' + (opts.method || 'POST') + '.' + path + '.' + payload,
      secret
    );
    return headers;
  }

  if (opts.legacyHeader && opts.legacySecret) {
    headers[opts.legacyHeader] = opts.legacySecret;
  }
  return headers;
}

if (typeof module !== 'undefined') {
  module.exports = { bytesToHex, hmacSha256Hex, criarHeadersBackendInterno };
}
