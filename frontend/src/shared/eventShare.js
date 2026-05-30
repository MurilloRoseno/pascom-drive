const DEFAULT_EVENT_TITLE = 'Galeria Pascom Drive';
const SHARE_PREFIX = 'Veja esta galeria da Paróquia São Rafael:';

function eventTitle(event = {}) {
  return event.title || event.titulo || DEFAULT_EVENT_TITLE;
}

function eventSlug(event = {}) {
  return event.slug || event.SlugPublico || event.slugPublico || '';
}

function eventId(event = {}) {
  return event.eventoId || event.id || '';
}

function cleanOrigin(origin = '') {
  return String(origin || '').replace(/\/$/, '');
}

export function buildEventShareUrl(event = {}, origin = '') {
  const base = cleanOrigin(origin);
  const slug = eventSlug(event);
  const id = eventId(event);
  const path = slug ? `/e/${encodeURIComponent(slug)}` : `/evento/${encodeURIComponent(id)}`;
  return `${base}${path}`;
}

export function buildEventShareText(event = {}, url = '') {
  return `${SHARE_PREFIX} ${eventTitle(event)} ${url}`.trim();
}

export function buildWhatsAppWebShareUrl(text = '') {
  return `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function buildEventSharePayload(event = {}, origin = '') {
  const url = buildEventShareUrl(event, origin);
  const title = eventTitle(event);
  const text = buildEventShareText(event, url);
  return {
    title,
    text,
    url,
    whatsappWebUrl: buildWhatsAppWebShareUrl(text),
  };
}

export async function shareEventNatively(payload, navigatorRef = globalThis.navigator) {
  let shouldCopy = true;
  try {
    if (navigatorRef?.share) {
      await navigatorRef.share({ title: payload.title, text: payload.text, url: payload.url });
      shouldCopy = false;
    }
  } catch (_error) {
    shouldCopy = true;
  }

  if (shouldCopy && navigatorRef?.clipboard?.writeText) {
    await navigatorRef.clipboard.writeText(payload.url);
  }
}
