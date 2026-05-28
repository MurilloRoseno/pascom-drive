const {
  appendMediaToken,
  issueMediaToken,
  mediaTokenAllows,
  MEDIA_TOKEN_TTL_MS,
} = require('../lib/media-token');

beforeEach(() => {
  process.env.MEDIA_TOKEN_SECRET = 'media-secret';
});

afterEach(() => {
  delete process.env.MEDIA_TOKEN_SECRET;
});

it('emite token temporario escopado para evento, foto e variante', () => {
  const now = Date.now();
  const token = issueMediaToken({ eventoId: 'EV1', fotoId: 'F1', variant: 'preview', now });
  expect(mediaTokenAllows(token, { eventoId: 'EV1', fotoId: 'F1', variant: 'preview', now: now + MEDIA_TOKEN_TTL_MS - 1 })).toBe(true);
  expect(mediaTokenAllows(token, { eventoId: 'EV1', fotoId: 'F2', variant: 'preview', now })).toBe(false);
  expect(mediaTokenAllows(token, { eventoId: 'EV1', fotoId: 'F1', variant: 'thumbnail', now })).toBe(false);
  expect(mediaTokenAllows(token, { eventoId: 'EV1', fotoId: 'F1', variant: 'preview', now: now + MEDIA_TOKEN_TTL_MS + 1 })).toBe(false);
});

it('anexa mt preservando query existente', () => {
  expect(appendMediaToken('/api/foto?variant=thumbnail', 'TOKEN')).toBe('/api/foto?variant=thumbnail&mt=TOKEN');
});
