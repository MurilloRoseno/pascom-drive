const crypto = require('crypto');

function workerHeaders({ path, body = {}, method = 'POST', secret = 'apps-script-hmac-test', timestamp = Date.now() }) {
  const payload = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${method}.${path}.${payload}`)
    .digest('hex');
  return {
    'x-pascom-timestamp': String(timestamp),
    'x-pascom-signature': signature,
  };
}

module.exports = { workerHeaders };
