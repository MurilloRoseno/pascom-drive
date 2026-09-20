// Upload retomavel do Google Drive feito direto pelo navegador.
// O backend (via Apps Script, como dono do Drive) abre a sessao; aqui so enviamos os bytes,
// em pedacos, para a URL da sessao — sem passar pelo limite de corpo da Vercel.

export const CHUNK_SIZE = 8 * 1024 * 1024; // multiplo de 256 KiB, exigido pelo Drive
export const MAX_FILE_SIZE = 40 * 1024 * 1024;
export const SESSION_BATCH = 20;
export const UPLOAD_CONCURRENCY = 3;

const MIME_BY_EXTENSION = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export class SessionExpiredError extends Error {
  constructor() {
    super('A sessao de envio expirou.');
    this.name = 'SessionExpiredError';
  }
}

export function fileKey(file) {
  return `${file.name}|${file.size}|${file.lastModified || 0}`;
}

export function fileMimeType(file) {
  const extension = /\.([a-z0-9]+)$/i.exec(file.name || '')?.[1]?.toLowerCase() || '';
  return MIME_BY_EXTENSION[extension] || '';
}

/** Retorna null quando o arquivo pode ser enviado, ou o motivo da recusa. */
export function rejectReason(file) {
  if (/\.(heic|heif)$/i.test(file.name || '') || /heic|heif/i.test(file.type || '')) {
    return 'HEIC do iPhone: exporte como JPG antes de enviar.';
  }
  const mimeType = fileMimeType(file);
  if (!mimeType || (file.type && file.type !== mimeType)) return 'Formato não aceito. Use JPG ou PNG.';
  if (!file.size) return 'Arquivo vazio.';
  if (file.size > MAX_FILE_SIZE) return 'Maior que 40 MB.';
  return null;
}

/** Mesma regra de google-apps-script/Upload.js (slugTituloEvento). */
export function slugTitulo(titulo) {
  return String(titulo || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9À-ɏ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
  return `${Math.max(bytes / 1024 ** 2, 0.1).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

function parseRangeEnd(response) {
  const range = response.headers?.get?.('Range') || response.headers?.get?.('range');
  const match = /bytes=0-(\d+)/.exec(range || '');
  return match ? Number(match[1]) + 1 : null;
}

const defaultSleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** Pergunta ao Drive quantos bytes ja chegaram (usado ao retomar ou depois de falha). */
export async function queryOffset(sessionUrl, total, { fetchImpl = fetch, signal, fallback = 0 } = {}) {
  const response = await fetchImpl(sessionUrl, {
    method: 'PUT',
    headers: { 'Content-Range': `bytes */${total}` },
    signal,
  });
  if (response.status === 200 || response.status === 201) return total;
  if (response.status === 404 || response.status === 410) throw new SessionExpiredError();
  if (response.status === 308) return parseRangeEnd(response) ?? fallback;
  throw new Error(`Drive respondeu ${response.status} ao consultar o envio.`);
}

function isAbort(error) {
  return error?.name === 'AbortError';
}

/**
 * Envia um arquivo para uma sessao retomavel, com repeticao e espera crescente.
 * onProgress recebe os bytes confirmados pelo Drive.
 */
export async function uploadFile({
  file,
  sessionUrl,
  startOffset = 0,
  resume = false,
  onProgress = () => {},
  signal,
  fetchImpl = fetch,
  chunkSize = CHUNK_SIZE,
  maxRetries = 5,
  sleep = defaultSleep,
}) {
  const total = file.size;
  let offset = startOffset;
  if (resume || offset > 0) {
    offset = await queryOffset(sessionUrl, total, { fetchImpl, signal, fallback: 0 });
    onProgress(offset);
    if (offset >= total) return;
  }

  let failures = 0;
  while (offset < total) {
    const end = Math.min(offset + chunkSize, total);
    let response = null;
    try {
      response = await fetchImpl(sessionUrl, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes ${offset}-${end - 1}/${total}` },
        body: file.slice(offset, end),
        signal,
      });
    } catch (error) {
      if (isAbort(error)) throw error;
    }

    if (response && (response.status === 200 || response.status === 201)) {
      onProgress(total);
      return;
    }
    if (response && response.status === 308) {
      offset = parseRangeEnd(response) ?? end;
      failures = 0;
      onProgress(offset);
      continue;
    }
    if (response && (response.status === 404 || response.status === 410)) throw new SessionExpiredError();
    if (response && response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 408) {
      throw new Error(`Drive recusou a foto (${response.status}).`);
    }

    failures += 1;
    if (failures > maxRetries) throw new Error('Conexão instável: não foi possível enviar esta foto.');
    await sleep(Math.min(1000 * 2 ** (failures - 1), 16000));
    try {
      offset = await queryOffset(sessionUrl, total, { fetchImpl, signal, fallback: offset });
      onProgress(offset);
    } catch (error) {
      if (isAbort(error) || error instanceof SessionExpiredError) throw error;
      // Sem resposta da consulta: tenta de novo a partir do ultimo ponto confirmado.
    }
  }
}

/** Executa worker(item) com no maximo `limit` tarefas simultaneas. */
export async function runPool(items, limit, worker) {
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

const STORAGE_KEY = 'pascom-upload-pendente-v1';

export function loadPendingUpload() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export function savePendingUpload(state) {
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // Modo privado ou armazenamento bloqueado: o envio segue, so nao da para retomar depois.
  }
}
