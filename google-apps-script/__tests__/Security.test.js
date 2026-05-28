const { criarHeadersBackendInterno, hmacSha256Hex } = require('../Security');

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1760000000000);
});

afterEach(() => {
  Date.now.mockRestore();
});

it('gera assinatura HMAC compativel com o backend', () => {
  PropertiesService.getScriptProperties().getProperty.mockImplementation((key) => ({
    APPS_SCRIPT_HMAC_SECRET: 'apps-secret',
  }[key] || null));

  const payload = JSON.stringify({ fileId: 'F1' });
  const headers = criarHeadersBackendInterno('/api/watermark', payload);

  expect(headers['x-pascom-timestamp']).toBe('1760000000000');
  expect(headers['x-pascom-signature']).toBe(
    hmacSha256Hex('1760000000000.POST./api/watermark.{"fileId":"F1"}', 'apps-secret')
  );
  expect(headers['x-watermark-secret']).toBeUndefined();
});

it('usa header legado apenas quando HMAC nao esta configurado', () => {
  PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);

  const headers = criarHeadersBackendInterno('/api/watermark', '{}', {
    legacyHeader: 'x-watermark-secret',
    legacySecret: 'legacy-secret',
  });

  expect(headers['x-pascom-signature']).toBeUndefined();
  expect(headers['x-watermark-secret']).toBe('legacy-secret');
});
