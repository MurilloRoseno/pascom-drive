# Real Watermark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a real pixel-level watermark (PNG overlay using screen blend) onto sample photos, replacing the current name-only `[AMOSTRA]` approach, and fix the duplicate-processing bug simultaneously.

**Architecture:** Apps Script detects new photos and calls a new backend endpoint `/api/watermark` passing only the Drive `fileId`. The backend downloads the photo using the Google Drive API (same service account already used for Sheets), composites the watermark PNG using `sharp` with screen-blend mode (which makes black backgrounds invisible), uploads the result to the AMOSTRAS folder, and returns the shareable link. The original file is then moved out of the source folder by Apps Script to prevent duplicate processing.

**Tech Stack:** Node.js + `sharp` (image compositing) + `googleapis` (Drive download/upload) + Google Apps Script `UrlFetchApp` (server-to-server call, no CORS)

---

## Why this architecture avoids the Vercel body-size limit

Vercel Hobby plan has a 4.5 MB request body limit. A 5 MB photo encoded as base64 becomes ~7 MB — too large. Sending only the `fileId` (a short string) avoids this entirely. The backend fetches the full file directly from Drive using the service account, which has no size limit.

## Why `screen` blend mode

The watermark PNGs have a **dark/black background** with the paróquia logo and text. Screen blend formula: `result = 1 - (1 - photo) × (1 - watermark)`. Black pixels in the watermark (value = 0) leave the photo unchanged. Bright pixels in the watermark lighten the photo, creating a visible overlay without covering the subject.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/assets/watermark-color.png` | CREATE (copy) | Colored watermark asset |
| `backend/assets/watermark-bw.png` | CREATE (copy) | B&W watermark asset |
| `backend/lib/google-drive.js` | CREATE | Download/upload files via Drive API v3 |
| `backend/lib/watermark-processor.js` | CREATE | sharp compositing logic |
| `backend/api/watermark.js` | CREATE | POST /api/watermark handler |
| `backend/__tests__/google-drive.test.js` | CREATE | Unit tests (mocked googleapis) |
| `backend/__tests__/watermark-processor.test.js` | CREATE | Integration tests (real sharp, tiny image) |
| `backend/__tests__/watermark-api.test.js` | CREATE | Supertest endpoint tests |
| `backend/server.js` | MODIFY | Add watermark route |
| `vercel.json` | MODIFY | Add 30 s maxDuration for watermark function |
| `google-apps-script/Watermark.js` | MODIFY | Call backend API; move file after processing |
| `google-apps-script/__tests__/Watermark.test.js` | MODIFY | Update tests for new API-based flow |

---

## Task 1: Setup — Assets + Dependencies

**Files:**
- Create: `backend/assets/` directory
- Copy: watermark PNGs into `backend/assets/`
- Modify: `backend/package.json`

- [ ] **Step 1: Create the assets directory and copy watermarks**

```bash
mkdir -p "C:\Users\muril\OneDrive\Documentos\claude\Pessoal\Pascom\Drive\backend\assets"
copy "C:\Users\muril\OneDrive\Documentos\claude\Pessoal\Pascom\Drive\marca-dagua\MARCA D'AGUA COLORIDA.png" \
     "C:\Users\muril\OneDrive\Documentos\claude\Pessoal\Pascom\Drive\backend\assets\watermark-color.png"
copy "C:\Users\muril\OneDrive\Documentos\claude\Pessoal\Pascom\Drive\marca-dagua\MARCA D'AGUA PRETO E BRANCO.png" \
     "C:\Users\muril\OneDrive\Documentos\claude\Pessoal\Pascom\Drive\backend\assets\watermark-bw.png"
```

On Linux/Mac (Vercel runs on Linux, so this also verifies the paths work):
```bash
# Windows PowerShell alternative:
New-Item -ItemType Directory -Force -Path backend\assets
Copy-Item "marca-dagua\MARCA D'AGUA COLORIDA.png"      backend\assets\watermark-color.png
Copy-Item "marca-dagua\MARCA D'AGUA PRETO E BRANCO.png" backend\assets\watermark-bw.png
```

- [ ] **Step 2: Install `sharp` and `googleapis` in backend**

```bash
cd backend
npm install sharp googleapis
```

Expected: both added to `dependencies` in `backend/package.json`.

> **Vercel note:** `sharp` ships pre-built binaries for `linux-x64` (Vercel's runtime). No extra config needed — `npm install` fetches the correct binary automatically.

- [ ] **Step 3: Add `.gitkeep` so `assets/` is tracked (the PNGs themselves will be committed)**

```bash
# Verify files copied correctly
ls backend/assets/
# Expected: watermark-bw.png  watermark-color.png
```

- [ ] **Step 4: Commit setup**

```bash
git add backend/assets/watermark-color.png backend/assets/watermark-bw.png backend/package.json backend/package-lock.json
git commit -m "chore: add watermark assets and install sharp + googleapis"
```

---

## Task 2: `backend/lib/google-drive.js` (TDD)

**Files:**
- Create: `backend/lib/google-drive.js`
- Create: `backend/__tests__/google-drive.test.js`

This module wraps the Google Drive API v3. It uses the same service-account credentials already used by `google-sheets.js`.

- [ ] **Step 1: Write the failing tests**

Create `backend/__tests__/google-drive.test.js`:

```js
// google-drive.test.js
jest.mock('googleapis');

const { google } = require('googleapis');
const { downloadFile, uploadFile } = require('../lib/google-drive');

describe('google-drive', () => {
  let mockDriveGet, mockDriveCreate, mockDriveFiles;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDriveGet = jest.fn().mockResolvedValue({
      data: Buffer.from('fake-image-bytes'),
      headers: { 'content-type': 'image/jpeg' },
    });
    mockDriveCreate = jest.fn().mockResolvedValue({
      data: { id: 'new-file-id-123' },
    });
    mockDriveFiles = { get: mockDriveGet, create: mockDriveCreate };

    google.drive = jest.fn().mockReturnValue({ files: mockDriveFiles });
    google.auth = { GoogleAuth: jest.fn().mockReturnValue({}) };
  });

  describe('downloadFile', () => {
    it('calls Drive files.get with alt=media and returns buffer + mimeType', async () => {
      const result = await downloadFile('file-id-abc');
      expect(mockDriveGet).toHaveBeenCalledWith(
        { fileId: 'file-id-abc', alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('uploadFile', () => {
    it('calls Drive files.create with correct name and parent folder', async () => {
      const buf = Buffer.from('watermarked');
      const link = await uploadFile(buf, 'image/jpeg', '[AMOSTRA]foto.jpg', 'folder-id-xyz');

      expect(mockDriveCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            name: '[AMOSTRA]foto.jpg',
            parents: ['folder-id-xyz'],
          }),
        })
      );
      expect(link).toBe('https://drive.google.com/file/d/new-file-id-123/view?usp=sharing');
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd backend
npx jest __tests__/google-drive.test.js --no-coverage
```

Expected: `Cannot find module '../lib/google-drive'`

- [ ] **Step 3: Implement `backend/lib/google-drive.js`**

```js
// google-drive.js — Drive API v3 wrapper using service-account credentials.
const { google } = require('googleapis');
const { Readable } = require('stream');

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

/**
 * Download a Drive file as a Buffer.
 * @param {string} fileId
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
async function downloadFile(fileId) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return {
    buffer: Buffer.from(response.data),
    mimeType: response.headers['content-type'] || 'image/jpeg',
  };
}

/**
 * Upload a Buffer as a new file inside a Drive folder.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} filename
 * @param {string} folderId
 * @returns {Promise<string>} Shareable link
 */
async function uploadFile(buffer, mimeType, filename, folderId) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const stream = Readable.from(buffer);
  const response = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id',
  });
  const fileId = response.data.id;
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

module.exports = { downloadFile, uploadFile };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest __tests__/google-drive.test.js --no-coverage
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/lib/google-drive.js backend/__tests__/google-drive.test.js
git commit -m "feat: add google-drive lib for Drive API download/upload"
```

---

## Task 3: `backend/lib/watermark-processor.js` (TDD)

**Files:**
- Create: `backend/lib/watermark-processor.js`
- Create: `backend/__tests__/watermark-processor.test.js`

This module uses `sharp` to composite the watermark onto a photo using screen blend mode. Tests use a real tiny in-memory image (no mocking sharp — mocking image libraries is fragile).

- [ ] **Step 1: Write the failing tests**

Create `backend/__tests__/watermark-processor.test.js`:

```js
// watermark-processor.test.js
// Uses real sharp with a synthetic tiny image — no mocking needed.
const sharp = require('sharp');
const { compositeWatermark } = require('../lib/watermark-processor');

let grayPixelJpeg; // 4×4 gray JPEG, used as a stand-in for a real photo

beforeAll(async () => {
  grayPixelJpeg = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
});

describe('compositeWatermark', () => {
  it('returns a non-empty Buffer', async () => {
    const result = await compositeWatermark(grayPixelJpeg, 'color');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('output is a valid JPEG (starts with FF D8)', async () => {
    const result = await compositeWatermark(grayPixelJpeg, 'color');
    expect(result[0]).toBe(0xff);
    expect(result[1]).toBe(0xd8);
  });

  it('accepts bw watermark type without throwing', async () => {
    await expect(compositeWatermark(grayPixelJpeg, 'bw')).resolves.toBeInstanceOf(Buffer);
  });

  it('falls back to color when unknown type given', async () => {
    await expect(compositeWatermark(grayPixelJpeg, 'unknown')).resolves.toBeInstanceOf(Buffer);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend
npx jest __tests__/watermark-processor.test.js --no-coverage
```

Expected: `Cannot find module '../lib/watermark-processor'`

- [ ] **Step 3: Implement `backend/lib/watermark-processor.js`**

```js
// watermark-processor.js — Composite a watermark PNG over a photo using screen blend.
// Screen blend formula: result = 1 - (1 - photo) × (1 - watermark)
// Black pixels (value=0) in the watermark are invisible; bright pixels lighten the photo.
const sharp = require('sharp');
const path = require('path');

const ASSETS = {
  color: path.join(__dirname, '../assets/watermark-color.png'),
  bw:    path.join(__dirname, '../assets/watermark-bw.png'),
};

/**
 * Composite a watermark over the given image buffer.
 * @param {Buffer} imageBuffer  JPEG or PNG input photo
 * @param {'color'|'bw'} type  Which watermark variant to use
 * @returns {Promise<Buffer>}   JPEG output at quality 85
 */
async function compositeWatermark(imageBuffer, type = 'color') {
  const watermarkPath = ASSETS[type] || ASSETS.color;

  const image = sharp(imageBuffer);
  const { width, height } = await image.metadata();

  const watermarkResized = await sharp(watermarkPath)
    .resize(width, height, { fit: 'fill' })
    .toBuffer();

  return image
    .composite([{ input: watermarkResized, blend: 'screen' }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

module.exports = { compositeWatermark };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest __tests__/watermark-processor.test.js --no-coverage
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/lib/watermark-processor.js backend/__tests__/watermark-processor.test.js
git commit -m "feat: add watermark-processor using sharp screen blend"
```

---

## Task 4: `backend/api/watermark.js` — Endpoint (TDD)

**Files:**
- Create: `backend/api/watermark.js`
- Create: `backend/__tests__/watermark-api.test.js`

The endpoint accepts `{ fileId, filename, destFolderId, watermarkType? }`, runs the full pipeline, returns `{ linkAmostra }`.

- [ ] **Step 1: Write the failing tests**

Create `backend/__tests__/watermark-api.test.js`:

```js
// watermark-api.test.js
jest.mock('../lib/google-drive');
jest.mock('../lib/watermark-processor');

const request = require('supertest');
const express = require('express');
const watermarkHandler = require('../api/watermark');
const { downloadFile } = require('../lib/google-drive');
const { uploadFile } = require('../lib/google-drive');
const { compositeWatermark } = require('../lib/watermark-processor');

// Import both mocked functions
const googleDrive = require('../lib/google-drive');

const app = express();
app.use(express.json());
const errorHandler = require('../middleware/error-handler');
app.post('/api/watermark', watermarkHandler);
app.use(errorHandler);

const VALID_BODY = {
  fileId: 'file-abc-123',
  filename: '[AMOSTRA]foto.jpg',
  destFolderId: 'folder-xyz-456',
};

beforeEach(() => {
  jest.clearAllMocks();
  googleDrive.downloadFile.mockResolvedValue({
    buffer: Buffer.from('fake-image'),
    mimeType: 'image/jpeg',
  });
  compositeWatermark.mockResolvedValue(Buffer.from('watermarked-image'));
  googleDrive.uploadFile.mockResolvedValue(
    'https://drive.google.com/file/d/new-id/view?usp=sharing'
  );
});

describe('POST /api/watermark', () => {
  it('returns 200 with linkAmostra on valid request', async () => {
    const res = await request(app).post('/api/watermark').send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      linkAmostra: 'https://drive.google.com/file/d/new-id/view?usp=sharing',
    });
  });

  it('calls downloadFile with the provided fileId', async () => {
    await request(app).post('/api/watermark').send(VALID_BODY);
    expect(googleDrive.downloadFile).toHaveBeenCalledWith('file-abc-123');
  });

  it('calls uploadFile with correct filename and destFolderId', async () => {
    await request(app).post('/api/watermark').send(VALID_BODY);
    expect(googleDrive.uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/jpeg',
      '[AMOSTRA]foto.jpg',
      'folder-xyz-456'
    );
  });

  it('uses color watermark by default', async () => {
    await request(app).post('/api/watermark').send(VALID_BODY);
    expect(compositeWatermark).toHaveBeenCalledWith(expect.any(Buffer), 'color');
  });

  it('accepts watermarkType bw', async () => {
    await request(app).post('/api/watermark').send({ ...VALID_BODY, watermarkType: 'bw' });
    expect(compositeWatermark).toHaveBeenCalledWith(expect.any(Buffer), 'bw');
  });

  it('returns 400 when fileId is missing', async () => {
    const res = await request(app)
      .post('/api/watermark')
      .send({ filename: 'x.jpg', destFolderId: 'folder' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when destFolderId is missing', async () => {
    const res = await request(app)
      .post('/api/watermark')
      .send({ fileId: 'abc', filename: 'x.jpg' });
    expect(res.status).toBe(400);
  });

  it('returns 405 for GET requests', async () => {
    const res = await request(app).get('/api/watermark');
    expect(res.status).toBe(405);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend
npx jest __tests__/watermark-api.test.js --no-coverage
```

Expected: `Cannot find module '../api/watermark'`

- [ ] **Step 3: Implement `backend/api/watermark.js`**

```js
// watermark.js — POST /api/watermark
// Receives { fileId, filename, destFolderId, watermarkType? }
// Downloads photo from Drive, applies watermark, uploads to AMOSTRAS folder.
const { z } = require('zod');
const { downloadFile, uploadFile } = require('../lib/google-drive');
const { compositeWatermark } = require('../lib/watermark-processor');

const schema = z.object({
  fileId:       z.string().min(1),
  filename:     z.string().min(1),
  destFolderId: z.string().min(1),
  watermarkType: z.enum(['color', 'bw']).default('color'),
});

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const params = schema.parse(req.body);
    const { buffer, mimeType } = await downloadFile(params.fileId);
    const watermarked = await compositeWatermark(buffer, params.watermarkType);
    // Output is always JPEG (quality 85) regardless of input type
    const linkAmostra = await uploadFile(watermarked, 'image/jpeg', params.filename, params.destFolderId);
    res.json({ linkAmostra });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    }
    next(err);
  }
};
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest __tests__/watermark-api.test.js --no-coverage
```

Expected: `8 passed`

- [ ] **Step 5: Run full backend test suite — must stay green**

```bash
npx jest --no-coverage
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/api/watermark.js backend/__tests__/watermark-api.test.js
git commit -m "feat: add POST /api/watermark endpoint"
```

---

## Task 5: Wire Endpoint + Update `vercel.json` Timeout

**Files:**
- Modify: `backend/server.js` (lines 8–34)
- Modify: `vercel.json` (root)

Photo watermarking can take 5–15 s for large files. The default Vercel Function timeout is 10 s (Hobby). We increase it to 30 s for the watermark function.

- [ ] **Step 1: Add the watermark route to `backend/server.js`**

Add after the existing requires at the top:

```js
const watermarkHandler = require('./api/watermark');
```

Add after line `app.post('/api/webhook/mercado-pago', pagamento, webhookHandler);`:

```js
app.post('/api/watermark', watermarkHandler);
```

Full relevant section of `server.js` after change:

```js
const healthHandler       = require('./api/health.js');
const fotosHandler        = require('./api/fotos');
const criarPagamentoHandler   = require('./api/criar-pagamento');
const statusPagamentoHandler  = require('./api/status-pagamento');
const webhookHandler      = require('./api/webhook/mercado-pago');
const watermarkHandler    = require('./api/watermark');   // ← ADD

// ... (middleware setup unchanged) ...

app.get('/api/health', healthHandler);
app.get('/api/fotos', fotosHandler);
app.post('/api/criar-pagamento', pagamento, criarPagamentoHandler);
app.get('/api/status-pagamento', statusPagamentoHandler);
app.post('/api/webhook/mercado-pago', pagamento, webhookHandler);
app.post('/api/watermark', watermarkHandler);             // ← ADD
```

- [ ] **Step 2: Update `vercel.json` to increase function timeout**

Replace the current `vercel.json` at repo root with:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/api/index.js",
      "use": "@vercel/node",
      "config": { "maxDuration": 30 }
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/api/index.js" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

- [ ] **Step 3: Start backend locally and smoke-test**

```bash
cd backend
node server.js
# In a second terminal:
curl -s http://localhost:3001/api/health
# Expected: {"status":"ok"}
```

(Full watermark test requires real Drive credentials — skip locally, test after deploy.)

- [ ] **Step 4: Commit**

```bash
git add backend/server.js vercel.json
git commit -m "feat: wire /api/watermark route and increase Vercel timeout to 30s"
```

---

## Task 6: Update `google-apps-script/Watermark.js`

**Files:**
- Modify: `google-apps-script/Watermark.js`
- Modify: `google-apps-script/__tests__/Watermark.test.js`

This task does two things in one commit:
1. Replace the simple file-copy for AMOSTRAS with a call to `POST /api/watermark`
2. Fix the duplicate-processing bug by calling `arquivo.moveTo(getOriginaisFolder())` after successful processing

- [ ] **Step 1: Update the tests first**

Open `google-apps-script/__tests__/Watermark.test.js`. Replace the entire file with:

```js
// Watermark.test.js
const {
  gerarIdFoto,
  gerarNomeAmostra,
  processarFoto,
} = require('../Watermark');

// --- Google globals mock (must match jest-setup.js) ---
const mockCopyFileToFolder = jest.fn();
const mockGetShareableLink = jest.fn();
const mockGetOriginaisFolder = jest.fn();
const mockAmostrasFolder = jest.fn();
const mockRegistrarFoto = jest.fn();

jest.mock('../Drive', () => ({
  copyFileToFolder: (...a) => mockCopyFileToFolder(...a),
  getShareableLink: (...a) => mockGetShareableLink(...a),
  getOriginaisFolder: (...a) => mockGetOriginaisFolder(...a),
  getAmostrasFolder: (...a) => mockAmostrasFolder(...a),
}));
jest.mock('../Sheet', () => ({
  registrarFoto: (...a) => mockRegistrarFoto(...a),
}));

// UrlFetchApp global
global.UrlFetchApp = {
  fetch: jest.fn(),
};

// PropertiesService global
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn((key) => {
      const props = {
        BACKEND_URL:    'https://pascom-drive.vercel.app',
        AMOSTRAS_FOLDER_ID: 'amostras-folder-id',
        ADMIN_EMAIL:    'admin@example.com',
      };
      return props[key] || null;
    }),
  }),
};

// MailApp global
global.MailApp = { sendEmail: jest.fn() };

// Utilities global
global.Utilities = {
  formatDate: jest.fn().mockReturnValue('01/01/2026 12:00:00'),
};

// Logger global
global.Logger = { log: jest.fn() };

// ---

describe('gerarIdFoto', () => {
  it('returns a string starting with FOTO_', () => {
    expect(gerarIdFoto()).toMatch(/^FOTO_\d+/);
  });
  it('generates unique IDs on successive calls', () => {
    expect(gerarIdFoto()).not.toBe(gerarIdFoto());
  });
});

describe('gerarNomeAmostra', () => {
  it('prepends [AMOSTRA] to the filename', () => {
    expect(gerarNomeAmostra('foto.jpg')).toBe('[AMOSTRA]foto.jpg');
  });
});

describe('processarFoto', () => {
  let mockArquivo;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockOriginaisFolder = { getId: () => 'originais-folder-id' };
    mockGetOriginaisFolder.mockReturnValue(mockOriginaisFolder);

    mockArquivo = {
      getId: jest.fn().mockReturnValue('file-drive-id'),
      getName: jest.fn().mockReturnValue('foto.jpg'),
      getParents: jest.fn().mockReturnValue({
        hasNext: jest.fn().mockReturnValue(true),
        next: jest.fn().mockReturnValue({ getName: () => 'Evento2026' }),
      }),
      moveTo: jest.fn(),
    };

    const mockCopiaOriginal = { getId: jest.fn().mockReturnValue('copia-original-id') };
    mockCopyFileToFolder.mockReturnValue(mockCopiaOriginal);
    mockGetShareableLink.mockReturnValue('https://drive.google.com/file/d/copia-original-id/view');

    // Mock successful API response
    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(200),
      getContentText: jest.fn().mockReturnValue(
        JSON.stringify({ linkAmostra: 'https://drive.google.com/file/d/amostra-id/view' })
      ),
    });
  });

  it('copies original to ORIGINAIS folder', () => {
    processarFoto(mockArquivo);
    expect(mockCopyFileToFolder).toHaveBeenCalledWith(
      mockArquivo,
      expect.anything(),
      expect.stringContaining('foto.jpg')
    );
  });

  it('calls backend /api/watermark with correct payload', () => {
    processarFoto(mockArquivo);
    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      'https://pascom-drive.vercel.app/api/watermark',
      expect.objectContaining({
        method: 'POST',
        payload: expect.stringContaining('"fileId":"file-drive-id"'),
      })
    );
  });

  it('moves the arquivo to ORIGINAIS folder after success (prevents duplicate processing)', () => {
    processarFoto(mockArquivo);
    expect(mockArquivo.moveTo).toHaveBeenCalledWith(expect.anything()); // called with originaisFolder
  });

  it('registers foto with linkAmostra from API response', () => {
    processarFoto(mockArquivo);
    expect(mockRegistrarFoto).toHaveBeenCalledWith(
      expect.objectContaining({
        linkAmostra: 'https://drive.google.com/file/d/amostra-id/view',
      })
    );
  });

  it('sends admin email on API error instead of throwing', () => {
    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(500),
      getContentText: jest.fn().mockReturnValue('Internal Server Error'),
    });
    processarFoto(mockArquivo);
    expect(global.MailApp.sendEmail).toHaveBeenCalledWith(
      'admin@example.com',
      expect.stringContaining('foto.jpg'),
      expect.any(String)
    );
  });

  it('does NOT move arquivo when API fails (source file stays for retry)', () => {
    global.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: jest.fn().mockReturnValue(500),
      getContentText: jest.fn().mockReturnValue('error'),
    });
    processarFoto(mockArquivo);
    expect(mockArquivo.moveTo).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (tests reference new behavior not yet implemented)**

```bash
cd google-apps-script
npx jest __tests__/Watermark.test.js --no-coverage
```

Expected: multiple failures (moveTo, UrlFetchApp.fetch not called, etc.)

- [ ] **Step 3: Rewrite `google-apps-script/Watermark.js`**

Replace the entire file:

```js
// Watermark.js — Photo processing: copy original, apply watermark via backend, register.
// "Watermark" = pixel-level PNG overlay applied by calling POST /api/watermark on the backend.

var PRECO_PADRAO = 25;
var _idCounter = 0;

function gerarIdFoto() {
  _idCounter += 1;
  return 'FOTO_' + new Date().getTime() + _idCounter;
}

function gerarNomeAmostra(nome) {
  return '[AMOSTRA]' + nome;
}

/**
 * Process a photo: copy original → ORIGINAIS, apply watermark via backend → AMOSTRAS,
 * move source file out of SOURCE folder (prevents duplicate processing), register in Sheet.
 * On any failure: sends admin email, leaves source file untouched for retry.
 * @param {GoogleAppsScript.Drive.File} arquivo
 */
function processarFoto(arquivo) {
  try {
    var id = gerarIdFoto();
    var nomeOriginal = arquivo.getName();
    var evento = arquivo.getParents().hasNext()
      ? arquivo.getParents().next().getName()
      : 'Sem_Evento';

    // 1. Copy original to ORIGINAIS folder (unchanged, high quality backup)
    var copiaOriginal = copyFileToFolder(arquivo, getOriginaisFolder(), id + '_' + nomeOriginal);
    var linkOriginal = getShareableLink(copiaOriginal);

    // 2. Call backend to apply watermark and upload to AMOSTRAS folder
    var props = PropertiesService.getScriptProperties();
    var backendUrl = props.getProperty('BACKEND_URL');
    var amostrasId  = props.getProperty('AMOSTRAS_FOLDER_ID');

    var payload = JSON.stringify({
      fileId:       arquivo.getId(),
      filename:     gerarNomeAmostra(id + '_' + nomeOriginal),
      destFolderId: amostrasId,
      watermarkType: 'color',
    });

    var response = UrlFetchApp.fetch(backendUrl + '/api/watermark', {
      method:           'POST',
      headers:          { 'Content-Type': 'application/json' },
      payload:          payload,
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Watermark API falhou (' + response.getResponseCode() + '): ' + response.getContentText());
    }

    var result     = JSON.parse(response.getContentText());
    var linkAmostra = result.linkAmostra;

    // 3. Move source file out of SOURCE folder — prevents reprocessing on next trigger run
    arquivo.moveTo(getOriginaisFolder());

    // 4. Register in Sheet
    registrarFoto({
      id:          id,
      evento:      evento,
      linkOriginal: linkOriginal,
      linkAmostra:  linkAmostra,
      preco:        PRECO_PADRAO,
    });

    Logger.log('Foto processada: ' + id);
  } catch (e) {
    var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    MailApp.sendEmail(
      adminEmail,
      '[Pascom] Erro ao processar foto: ' + arquivo.getName(),
      'Erro: ' + e.message
    );
    Logger.log('Erro processarFoto: ' + e.message);
    // Do NOT move arquivo — leave in SOURCE folder so the next trigger run retries
  }
}

if (typeof module !== 'undefined') {
  module.exports = { gerarIdFoto, gerarNomeAmostra, processarFoto };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd google-apps-script
npx jest __tests__/Watermark.test.js --no-coverage
```

Expected: `7 passed`

- [ ] **Step 5: Run full Apps Script test suite — must stay green**

```bash
npx jest --no-coverage
```

Expected: all 35+ existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add google-apps-script/Watermark.js google-apps-script/__tests__/Watermark.test.js
git commit -m "feat: real watermark via backend API + fix duplicate processing bug"
```

---

## Task 7: Add `BACKEND_URL` Script Property + Deploy + Smoke Test

**Files:** No code changes — production configuration.

- [ ] **Step 1: Add `BACKEND_URL` to Apps Script Script Properties**

In `script.google.com` → Your project → ⚙️ Project Settings → Script Properties:

| Property | Value |
|----------|-------|
| `BACKEND_URL` | `https://pascom-drive.vercel.app` |

(All other properties — `SPREADSHEET_ID`, `SOURCE_FOLDER_ID`, `ORIGINAIS_FOLDER_ID`, `AMOSTRAS_FOLDER_ID`, `ADMIN_EMAIL` — must already be set from the initial production setup.)

- [ ] **Step 2: Enable Drive API scope in Apps Script**

The updated `Watermark.js` calls `arquivo.moveTo()` which requires `DriveApp` (already used). No new scope needed for `UrlFetchApp` — it's auto-granted.

Verify in Apps Script editor → Overview → OAuth Scopes includes:
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/script.external_request` (for UrlFetchApp)

If `external_request` is missing, add it manually in `appsscript.json`:

```json
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

- [ ] **Step 3: Push branch and merge PR to trigger Vercel deploy**

```bash
git push origin phase-4/frontend-backend-integration
```

Then on GitHub: merge the PR (or open a new one from this branch → master).

Wait for Vercel build to complete (watch at vercel.com dashboard).

- [ ] **Step 4: Smoke test backend watermark endpoint**

```bash
curl -s https://pascom-drive.vercel.app/api/health
# Expected: {"status":"ok"}
```

(Full watermark test requires real Drive fileId — do next step.)

- [ ] **Step 5: End-to-end test in Apps Script**

In Apps Script editor:
1. Select function `processarFotosNovas`
2. Click ▶ Run
3. Check Execution Log — expected output:
   ```
   processarFotosNovas: <timestamp>
   1 arquivo(s) novo(s).
   Foto processada: FOTO_17XXXXXXXXXX1
   ```
4. Check Google Sheets — new row with `Status = Processada` and `Link_Amostra` pointing to a watermarked image
5. Open the `Link_Amostra` URL — verify the paróquia watermark is visible on the photo

---

## Self-Review

**Spec coverage:**
- ✅ Real pixel watermark using PNG overlay → Task 3 (sharp screen blend)
- ✅ Color watermark variant → Task 3 + Task 6 (`watermarkType: 'color'`)
- ✅ B&W watermark variant → Task 3 + endpoint supports `watermarkType: 'bw'`
- ✅ No Vercel body-size limit hit → Task 2 (backend downloads directly from Drive)
- ✅ Duplicate processing bug fixed → Task 6 (`arquivo.moveTo()` on success)
- ✅ Error handling preserves source file for retry → Task 6 (moveTo only on success)
- ✅ `BACKEND_URL` Script Property → Task 7

**Placeholder scan:** No TBDs, no "handle edge cases" — all steps include complete code.

**Type consistency:**
- `downloadFile(fileId)` → `{ buffer: Buffer, mimeType: string }` — consistent Task 2 → Task 4
- `compositeWatermark(buffer, type)` → `Buffer` — consistent Task 3 → Task 4
- `uploadFile(buffer, mimeType, filename, folderId)` → `string` (link) — consistent Task 2 → Task 4
- `linkAmostra` field name — consistent across Task 4 endpoint response and Task 6 Apps Script parser
