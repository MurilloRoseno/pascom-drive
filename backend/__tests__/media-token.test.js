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

it('marca tokens de administracao e os aceita por mais tempo', () => {
  process.env.MEDIA_TOKEN_SECRET = process.env.MEDIA_TOKEN_SECRET || 'segredo-midia-teste';
  const { issueMediaToken: issue, mediaTokenAccess, ADMIN_MEDIA_TOKEN_TTL_MS } = require('../lib/media-token');
  const now = Date.now();
  const admin = issue({ eventoId: 'EV1', fotoId: 'F1', variant: 'thumbnail', admin: true, now });
  const comum = issue({ eventoId: 'EV1', fotoId: 'F1', variant: 'thumbnail', now });
  const opts = { eventoId: 'EV1', fotoId: 'F1', variant: 'thumbnail' };
  expect(mediaTokenAccess(admin, { ...opts, now: now + ADMIN_MEDIA_TOKEN_TTL_MS - 1 })).toEqual({ allowed: true, admin: true });
  expect(mediaTokenAccess(comum, { ...opts, now })).toEqual({ allowed: true, admin: false });
  expect(mediaTokenAccess(admin, { ...opts, now: now + ADMIN_MEDIA_TOKEN_TTL_MS + 1 })).toEqual({ allowed: false, admin: false });
});
