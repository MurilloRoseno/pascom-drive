# Image Pre-processor Implementation Plan

> Historical implementation plan. For the active commercial and storage flow, follow `docs/FLUXO_COMERCIAL_SEGURO.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before the existing watermark flow, automatically convert non-JPEG formats to JPEG and compress oversized originals to reduce file size, so the ORIGINAL stored in Drive is already optimised (not a 2 GB raw file).

**Architecture:** A new `POST /api/preprocess` endpoint (same pattern as `/api/watermark`) downloads the file from Drive, converts its format with Sharp, compresses to ≤5000 px at JPEG quality 90, and patches the content back to the same Drive file via the Drive v3 PATCH API. Apps Script calls this endpoint as the very first step inside `processarFoto()`, before copying to ORIGINAIS. If the format is unsupported (camera RAW) or the file is already small JPEG (< 2 MB), the endpoint returns `{ skipped: true }` and processing continues untouched.

**Tech Stack:** Node.js + Sharp (already installed), Drive v3 REST PATCH API, Google Apps Script UrlFetchApp, Jest + Supertest.

---

## File map

| File | Action |
|---|---|
| `backend/lib/google-drive.js` | Add `updateFile(fileId, buffer, mimeType)` |
| `backend/api/preprocess.js` | New endpoint |
| `backend/server.js` | Register `POST /api/preprocess` |
| `backend/middleware/rate-limit.js` | Export existing `watermark` limit as `preprocess` alias |
| `google-apps-script/Watermark.js` | Call `/api/preprocess` before step 1 |
| `backend/__tests__/preprocess.test.js` | New test file |
| `backend/__tests__/google-drive.test.js` | Add `updateFile` tests |
| `google-apps-script/__tests__/Watermark.test.js` | Add preprocess call test |

---

## Task 1 — Add `updateFile()` to `backend/lib/google-drive.js`

Drive v3 PATCH replaces the file's content while keeping its ID and sharing settings.

**Files:**
- Modify: `backend/lib/google-drive.js`
- Test: `backend/__tests__/google-drive.test.js`

- [ ] **Step 1.1: Write failing test**

Add to `backend/__tests__/google-drive.test.js`:

```js
describe('updateFile', () => {
  it('PATCHes Drive with the given buffer and mimeType', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { updateFile } = require('../lib/google-drive');
    await updateFile('file-xyz', Buffer.from('data'), 'image/jpeg');

    const [url, opts] = mockFetch.mock.calls[1];
    expect(url).toMatch(/upload\/drive\/v3\/files\/file-xyz/);
    expect(opts.method).toBe('PATCH');
    expect(opts.headers.Authorization).toBe('Bearer tok');
  });

  it('throws when Drive returns non-ok', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });

    const { updateFile } = require('../lib/google-drive');
    await expect(updateFile('file-xyz', Buffer.from('data'), 'image/jpeg')).rejects.toThrow('Drive update failed');
  });
});
```

- [ ] **Step 1.2: Run to confirm failure**

```bash
cd backend && npm test -- --testPathPattern="google-drive" 2>&1 | tail -10
```
Expected: `updateFile is not a function` or similar.

- [ ] **Step 1.3: Implement `updateFile`**

Append before `module.exports` in `backend/lib/google-drive.js`:

```js
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
```

Also add `updateFile` to `module.exports`:
```js
module.exports = { downloadFile, uploadFile, updateFile };
```

- [ ] **Step 1.4: Run tests**

```bash
cd backend && npm test -- --testPathPattern="google-drive" 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add backend/lib/google-drive.js backend/__tests__/google-drive.test.js
git commit -m "feat(drive): add updateFile() for PATCH-replacing file content"
```

---

## Task 2 — New `/api/preprocess` endpoint

**Files:**
- Create: `backend/api/preprocess.js`
- Create: `backend/__tests__/preprocess.test.js`

Supported MIME types (Sharp can decode these):
`image/jpeg`, `image/png`, `image/webp`, `image/tiff`, `image/gif`, `image/avif`, `image/heic`, `image/heif`

Skip condition: already `image/jpeg` AND buffer size < 2 MB.

- [ ] **Step 2.1: Write failing tests**

Create `backend/__tests__/preprocess.test.js`:

```js
jest.mock('../lib/google-drive');
jest.mock('sharp');

process.env.WATERMARK_API_SECRET = 'test-secret';

const request   = require('supertest');
const express   = require('express');
const handler   = require('../api/preprocess');
const drive     = require('../lib/google-drive');
const sharp     = require('sharp');
const errorHandler = require('../middleware/error-handler');

const app = express();
app.use(express.json());
app.all('/api/preprocess', handler);
app.use(errorHandler);

const SMALL_JPEG = Buffer.alloc(1024 * 100); // 100 KB

// Mock Sharp chain: .rotate().resize().jpeg().withMetadata().toBuffer()
function mockSharpChain(outputBuffer) {
  const chain = {
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    jpeg:   jest.fn().mockReturnThis(),
    withMetadata: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(outputBuffer),
  };
  sharp.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  drive.downloadFile.mockResolvedValue({ buffer: Buffer.alloc(1024 * 1024 * 5), mimeType: 'image/png' });
  drive.updateFile.mockResolvedValue(undefined);
  mockSharpChain(Buffer.alloc(1024 * 500)); // 500 KB output
});

describe('POST /api/preprocess', () => {
  it('returns 401 without secret header', async () => {
    const res = await request(app).post('/api/preprocess').send({ fileId: 'f1' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when fileId is missing', async () => {
    const res = await request(app).post('/api/preprocess').set('x-watermark-secret', 'test-secret').send({});
    expect(res.status).toBe(400);
  });

  it('returns 405 for GET', async () => {
    const res = await request(app).get('/api/preprocess');
    expect(res.status).toBe(405);
  });

  it('downloads the file by fileId', async () => {
    await request(app).post('/api/preprocess').set('x-watermark-secret', 'test-secret').send({ fileId: 'f1' });
    expect(drive.downloadFile).toHaveBeenCalledWith('f1');
  });

  it('converts PNG and calls updateFile with image/jpeg', async () => {
    await request(app).post('/api/preprocess').set('x-watermark-secret', 'test-secret').send({ fileId: 'f1' });
    expect(drive.updateFile).toHaveBeenCalledWith('f1', expect.any(Buffer), 'image/jpeg');
  });

  it('returns JSON with originalSize, processedSize, skipped:false', async () => {
    const res = await request(app).post('/api/preprocess').set('x-watermark-secret', 'test-secret').send({ fileId: 'f1' });
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(false);
    expect(typeof res.body.originalSize).toBe('number');
    expect(typeof res.body.processedSize).toBe('number');
  });

  it('skips small JPEG (< 2 MB) without calling updateFile', async () => {
    drive.downloadFile.mockResolvedValue({ buffer: SMALL_JPEG, mimeType: 'image/jpeg' });
    const res = await request(app).post('/api/preprocess').set('x-watermark-secret', 'test-secret').send({ fileId: 'f1' });
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
    expect(drive.updateFile).not.toHaveBeenCalled();
  });

  it('returns 422 for unsupported format (camera RAW)', async () => {
    drive.downloadFile.mockResolvedValue({ buffer: Buffer.alloc(1000), mimeType: 'image/x-canon-cr2' });
    const res = await request(app).post('/api/preprocess').set('x-watermark-secret', 'test-secret').send({ fileId: 'f1' });
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2.2: Run to confirm failure**

```bash
cd backend && npm test -- --testPathPattern="preprocess" 2>&1 | tail -10
```
Expected: `Cannot find module '../api/preprocess'`.

- [ ] **Step 2.3: Implement `backend/api/preprocess.js`**

```js
const sharp = require('sharp');
const { downloadFile, updateFile } = require('../lib/google-drive');

const SUPPORTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
  'image/gif', 'image/avif', 'image/heic', 'image/heif',
]);
const SMALL_JPEG_THRESHOLD = 2 * 1024 * 1024; // 2 MB

function sendJson(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const secret = process.env.WATERMARK_API_SECRET;
  if (!secret || req.headers['x-watermark-secret'] !== secret) {
    console.warn(JSON.stringify({ event: 'preprocess_unauthorized', ip: req.ip, ts: new Date().toISOString() }));
    return sendJson(res, 401, { error: 'Não autorizado' });
  }

  const { fileId } = req.body || {};
  if (!fileId) return sendJson(res, 400, { error: 'fileId obrigatório' });

  try {
    const { buffer, mimeType } = await downloadFile(fileId);
    const originalSize = buffer.length;

    if (!SUPPORTED.has(mimeType)) {
      return sendJson(res, 422, { error: `Formato não suportado: ${mimeType}` });
    }

    // Skip small JPEGs — already optimal
    if (mimeType === 'image/jpeg' && originalSize < SMALL_JPEG_THRESHOLD) {
      return sendJson(res, 200, { skipped: true, originalSize, processedSize: originalSize, originalMimeType: mimeType });
    }

    const processed = await sharp(buffer)
      .rotate()                                         // auto-orient from EXIF
      .resize(5000, 5000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .withMetadata()
      .toBuffer();

    await updateFile(fileId, processed, 'image/jpeg');

    console.log(JSON.stringify({
      event: 'preprocess_done',
      fileId,
      originalMimeType: mimeType,
      originalSize,
      processedSize: processed.length,
      reductionPct: Math.round((1 - processed.length / originalSize) * 100),
      ts: new Date().toISOString(),
    }));

    return sendJson(res, 200, {
      skipped: false,
      originalMimeType: mimeType,
      originalSize,
      processedSize: processed.length,
    });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2.4: Run tests**

```bash
cd backend && npm test -- --testPathPattern="preprocess" 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add backend/api/preprocess.js backend/__tests__/preprocess.test.js
git commit -m "feat(preprocess): new /api/preprocess endpoint — convert + compress images"
```

---

## Task 3 — Register route in `backend/server.js`

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 3.1: Add import + route**

In `backend/server.js`, after the `watermarkHandler` import:
```js
const preprocessHandler = require('./api/preprocess');
```

After the `app.post('/api/watermark', ...)` line:
```js
app.post('/api/preprocess', watermarkLimit, preprocessHandler);
```

(Reuse `watermarkLimit` — same computational cost as watermarking.)

- [ ] **Step 3.2: Run full backend suite**

```bash
cd backend && npm test 2>&1 | tail -10
```
Expected: all suites pass.

- [ ] **Step 3.3: Commit**

```bash
git add backend/server.js
git commit -m "feat(server): register POST /api/preprocess route"
```

---

## Task 4 — Call `/api/preprocess` from Apps Script `processarFoto()`

**Files:**
- Modify: `google-apps-script/Watermark.js`
- Test: `google-apps-script/__tests__/Watermark.test.js` (or equivalent)

The new step runs BEFORE step 1 (copy to ORIGINAIS). If it returns 422 (unsupported format), log a warning but continue — the original file proceeds unchanged. Any other error (network, 5xx) is thrown and triggers the existing email-on-failure path.

- [ ] **Step 4.1: Write failing test**

Find the existing Watermark test file:
```bash
ls google-apps-script/__tests__/
```

Add a test that verifies `processarFoto` calls the preprocess URL before copying:

```js
it('calls /api/preprocess before copying to ORIGINAIS', () => {
  // Arrange: mock UrlFetchApp.fetch for both preprocess and watermark calls
  var fetchMock = jest.fn()
    .mockReturnValueOnce({ getResponseCode: () => 200, getContentText: () => '{"skipped":false}', getBlob: () => null })  // preprocess
    .mockReturnValueOnce({ getResponseCode: () => 200, getContentText: () => '', getBlob: () => mockBlob() });             // watermark

  global.UrlFetchApp = { fetch: fetchMock };
  // ... call processarFoto(mockArquivo) ...
  // Assert preprocess was first call
  expect(fetchMock.mock.calls[0][0]).toContain('/api/preprocess');
});
```

Adapt to match the existing test file's mock pattern.

- [ ] **Step 4.2: Implement the preprocess call in `Watermark.js`**

Inside `processarFoto(arquivo)`, add as the very first block inside `try`:

```js
// 0. Pre-process: convert format + compress (step added before any copying)
var preprocessResult = _preprocessarArquivo(arquivo, props, backendUrl, headers);
if (preprocessResult && preprocessResult.skipped === false) {
  Logger.log('Pre-processado: ' + JSON.stringify(preprocessResult));
}
```

Add the helper function (outside `processarFoto`, at module scope):

```js
/**
 * Call /api/preprocess to convert format + compress.
 * Returns parsed JSON body on success, null if unsupported format (422 → skip silently).
 * Throws on any other non-2xx status.
 * @param {GoogleAppsScript.Drive.File} arquivo
 * @param {GoogleAppsScript.Properties.Properties} props
 * @param {string} backendUrl
 * @param {Object} headers
 * @returns {Object|null}
 */
function _preprocessarArquivo(arquivo, props, backendUrl, headers) {
  var payload = JSON.stringify({ fileId: arquivo.getId() });
  var response = UrlFetchApp.fetch(backendUrl + '/api/preprocess', {
    method:             'POST',
    headers:            headers,
    payload:            payload,
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  if (code === 422) {
    Logger.log('Formato não suportado para pre-processamento: ' + arquivo.getName() + ' — continuando sem converter.');
    return null;
  }
  if (code !== 200) {
    throw new Error('Preprocess API falhou (' + code + '): ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}
```

Note: `props`, `backendUrl`, `headers` are already computed inside `processarFoto` — move their declaration to BEFORE the preprocess call so they're available:

```js
function processarFoto(arquivo) {
  try {
    var id = gerarIdFoto();
    var nomeOriginal = arquivo.getName();
    var evento = arquivo.getParents().hasNext()
      ? arquivo.getParents().next().getName()
      : 'Sem_Evento';

    // Props/URL/headers needed by both preprocess and watermark
    var props      = PropertiesService.getScriptProperties();
    var backendUrl = props.getProperty('BACKEND_URL');
    var headers    = {
      'Content-Type': 'application/json',
      'x-watermark-secret': props.getProperty('WATERMARK_API_SECRET') || '',
    };

    // 0. Pre-process: convert format + compress
    _preprocessarArquivo(arquivo, props, backendUrl, headers);

    // 1. Copy original to ORIGINAIS (now the pre-processed JPEG)
    var copiaOriginal = _helpers.copyFileToFolder(arquivo, _helpers.getOriginaisFolder(), id + '_' + nomeOriginal);
    // ... rest unchanged ...
```

(Remove the duplicate `props`, `backendUrl`, `headers` declarations that currently appear before the `response = UrlFetchApp.fetch(/api/watermark...)` call, since they're now declared above.)

- [ ] **Step 4.3: Run Apps Script tests**

```bash
cd google-apps-script && npm test 2>&1 | tail -15
```
Expected: all tests pass.

- [ ] **Step 4.4: Commit**

```bash
git add google-apps-script/Watermark.js
git commit -m "feat(apps-script): call /api/preprocess before watermark in processarFoto"
```

---

## Task 5 — Run full suite + push

- [ ] **Step 5.1: Run backend full suite**

```bash
cd backend && npm test 2>&1 | tail -10
```
Expected: all suites pass.

- [ ] **Step 5.2: Run Apps Script full suite**

```bash
cd google-apps-script && npm test 2>&1 | tail -10
```
Expected: all suites pass.

- [ ] **Step 5.3: Push feature branch + merge to main**

```bash
git push origin phase-4/frontend-backend-integration
# from main worktree:
git merge phase-4/frontend-backend-integration
git push origin main
```

---

## Verificação end-to-end

1. Deploy Vercel pega automaticamente após push to main.
2. Verificar `/api/health` responde 200.
3. No Google Apps Script editor: abrir `Code.js` → executar `processarFotosNovas()` manualmente com uma foto PNG de teste na pasta SOURCE.
4. Logs do Apps Script devem mostrar: `Pre-processado: {"skipped":false,"originalMimeType":"image/png",...}` seguido de `Foto processada: FOTO_...`.
5. Verificar em Vercel Logs: evento `preprocess_done` com `reductionPct` > 0.
6. Verificar no Drive: arquivo na pasta ORIGINAIS é JPEG (não PNG).
7. Testar com foto JPEG < 2 MB: logs mostram `skipped: true`, nenhuma chamada ao updateFile.
8. Testar com arquivo `.cr2` (ou mimeType `image/x-canon-cr2`): endpoint retorna 422, Apps Script loga aviso e continua sem falhar.

---

## Fora de escopo

- Suporte a RAW de câmera (CR2, NEF, ARW) — requer `dcraw` binário, inviável no Vercel serverless.
- Redução de resolução mais agressiva para ORIGINAIS — usuário quer qualidade preservada.
- Processamento em batch / fila de imagens — YAGNI para MVP.
- Progress callback para arquivos muito grandes — Vercel tem timeout de 30s; arquivos > ~500 MB podem falhar (Drive download timeout), mas são raros na prática de fotografias de eventos paroquiais.
