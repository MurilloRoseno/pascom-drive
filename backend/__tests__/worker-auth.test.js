const { authorizeWorker, expectedSignature } = require('../lib/worker-auth');

function req({ body = { fileId: 'F1' }, timestamp = Date.now(), signature, path = '/api/watermark', method = 'POST' } = {}) {
  return {
    method,
    url: path,
    headers: {
      'x-pascom-timestamp': String(timestamp),
      'x-pascom-signature': signature || expectedSignature({
        timestamp: String(timestamp),
        method,
        path,
        body: JSON.stringify(body),
        secret: 'apps-secret',
      }),
    },
    body,
    ip: '127.0.0.1',
  };
}

beforeEach(() => {
  process.env.APPS_SCRIPT_HMAC_SECRET = 'apps-secret';
  delete process.env.ALLOW_LEGACY_WORKER_SECRET;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  console.warn.mockRestore();
});

it('autoriza assinatura HMAC valida', () => {
  expect(authorizeWorker(req())).toBe(true);
});

it('rejeita body adulterado apos assinatura', () => {
  const signed = req({ body: { fileId: 'F1' } });
  signed.body = { fileId: 'F2' };
  expect(authorizeWorker(signed)).toBe(false);
});

it('rejeita timestamp fora da janela de cinco minutos', () => {
  expect(authorizeWorker(req({ timestamp: Date.now() - 6 * 60 * 1000 }))).toBe(false);
});

it('aceita segredo legado apenas com flag temporaria', () => {
  const legacyReq = {
    method: 'POST',
    url: '/api/watermark',
    headers: { 'x-watermark-secret': 'legacy-secret' },
    body: { fileId: 'F1' },
  };
  expect(authorizeWorker(legacyReq, {
    legacyHeader: 'x-watermark-secret',
    legacySecret: 'legacy-secret',
  })).toBe(false);
  process.env.ALLOW_LEGACY_WORKER_SECRET = 'true';
  expect(authorizeWorker(legacyReq, {
    legacyHeader: 'x-watermark-secret',
    legacySecret: 'legacy-secret',
  })).toBe(true);
});
