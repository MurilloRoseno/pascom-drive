# Phase 4 — Frontend-Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React gallery and checkout to the live Express backend: real photo listing, PIX payment creation with QR code, and polling for payment approval.

**Architecture:** A centralized `frontend/src/lib/api.js` service wraps all `fetch()` calls using `VITE_API_BASE_URL`. The Gallery reads from `GET /api/fotos`; Checkout Step 2→3 calls `POST /api/criar-pagamento` to receive the QR code; a `usePollingStatus` hook polls `GET /api/status-pagamento` every 3 s until `approved` or timeout.

**Tech Stack:** React 18, Vite, native fetch, Zod (already installed), Jest + React Testing Library

---

## Context

Phases 1–3 delivered: Express backend (5 REST endpoints), Mercado Pago PIX integration, Google Sheets persistence, React frontend with mock gallery data, 4-step checkout UI (steps 2–4 are placeholders). Phase 4 wires them together end-to-end.

**Env var bug to fix first:** `backend/lib/google-sheets.js` reads `process.env.GOOGLE_SHEETS_ID` but every other file uses `SPREADSHEET_ID`. Must rename before starting.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/lib/google-sheets.js` | Modify (line 7) | Fix env var name `GOOGLE_SHEETS_ID` → `SPREADSHEET_ID` |
| `backend/.env` | Create | Backend credentials (not committed) |
| `frontend/.env.local` | Create | Vite env (not committed) |
| `frontend/src/lib/api.js` | Create | Centralized fetch service for all backend calls |
| `frontend/src/__tests__/api.test.js` | Create | Unit tests for api.js using mocked fetch |
| `frontend/src/hooks/useFotos.js` | Modify | Replace mock data with `listarFotos()` from api.js |
| `frontend/src/__tests__/useFotos.test.js` | Create | Test hook with mocked api.js |
| `frontend/src/pages/Checkout.jsx` | Modify | Add payment creation on Step 2→3, store qrCode |
| `frontend/src/components/PixDisplay.jsx` | Create | QR code image + copia-e-cola + copy button |
| `frontend/src/hooks/usePollingStatus.js` | Create | Poll /api/status-pagamento every 3 s |
| `frontend/src/__tests__/usePollingStatus.test.js` | Create | Test polling hook |
| `frontend/src/__tests__/Checkout.test.jsx` | Create | Test checkout payment + QR + success states |

---

## Task 1: Fix Env Var Bug + Configure Local Envs

**Files:**
- Modify: `backend/lib/google-sheets.js` line 7
- Create: `backend/.env`
- Create: `frontend/.env.local`

- [ ] **Step 1: Fix `GOOGLE_SHEETS_ID` → `SPREADSHEET_ID` in google-sheets.js**

Open `backend/lib/google-sheets.js` line 7. Change:
```js
// BEFORE:
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID);

// AFTER:
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
```

- [ ] **Step 2: Create `backend/.env`**

Create file `backend/.env` with these values (copy actual values from root `.env.local`):
```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

GOOGLE_SERVICE_ACCOUNT_EMAIL=sheets-bot@pascom-495518.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=16q5IbMjL1UoW8uiE54-lJCq05qUHGwknGOPlDFWvwi8

SOURCE_FOLDER_ID=1cCymQFFZY7Uzlrv04QlNyIva8qy1OuPf
ORIGINAIS_FOLDER_ID=1B8b2Sbs9w-63rTsCM0feagKpgC1mREaz
AMOSTRAS_FOLDER_ID=1KenzlPhegw4OCZbpA7SExe7OpkRDlwQL

MP_ACCESS_TOKEN=TEST-<configure-no-ambiente-seguro>
MP_WEBHOOK_SECRET=c97c74e28ca4ca8a48e82d4d8a603bd963874f61dfbd44ce9cea99e11e5a5e78

ADMIN_EMAIL=murillo.roseno.lima@gmail.com
```

> Note: `FRONTEND_URL=http://localhost:5173` because Vite default port is 5173. If frontend runs on a different port, update this.

- [ ] **Step 3: Create `frontend/.env.local`**

Create file `frontend/.env.local`:
```
VITE_API_BASE_URL=http://localhost:3001
```

- [ ] **Step 4: Verify backend starts**

```bash
cd backend && node server.js
```

Expected output:
```
Servidor rodando na porta 3001
```

Press Ctrl+C after confirming it starts.

- [ ] **Step 5: Verify backend tests still pass**

```bash
cd backend && npm test
```

Expected: All tests pass (the env fix must not break existing tests — they mock the module).

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\muril\OneDrive\Documentos\claude\Pessoal\Pascom\Drive"
git checkout -b phase-4/frontend-backend-integration
git add backend/lib/google-sheets.js
git commit -m "fix(backend): rename GOOGLE_SHEETS_ID env var to SPREADSHEET_ID"
```

---

## Task 2: Create `frontend/src/lib/api.js` (TDD)

**Files:**
- Create: `frontend/src/__tests__/api.test.js`
- Create: `frontend/src/lib/api.js`

- [ ] **Step 1: Create failing tests**

Create `frontend/src/__tests__/api.test.js`:

```js
// api.test.js — tests for centralized fetch service
global.fetch = jest.fn();

const BASE = 'http://localhost:3001';
process.env.VITE_API_BASE_URL = BASE;

// Must require AFTER setting env so module picks it up
const { listarFotos, criarPagamento, statusPagamento } = require('../lib/api');

beforeEach(() => {
  fetch.mockReset();
});

function mockOk(body) {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockErr(status, body) {
  fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

// ─── listarFotos ─────────────────────────────────────────────────────────────

describe('listarFotos', () => {
  it('calls GET /api/fotos and returns array', async () => {
    const fotos = [{ id: 'F1', event: 'Missa', url: 'http://x.com/1.jpg', price: 25 }];
    mockOk(fotos);
    const result = await listarFotos();
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/fotos`);
    expect(result).toEqual(fotos);
  });

  it('throws with message on non-ok response', async () => {
    mockErr(500, { error: 'Erro interno' });
    await expect(listarFotos()).rejects.toThrow('Erro interno');
  });

  it('throws generic message when error body has no message', async () => {
    mockErr(503, {});
    await expect(listarFotos()).rejects.toThrow('Erro ao listar fotos');
  });
});

// ─── criarPagamento ───────────────────────────────────────────────────────────

describe('criarPagamento', () => {
  const payload = { whatsapp: '11999999999', fotoIds: ['F1', 'F2'], total: 50 };
  const resposta = { id: 'MP_001', qrCode: 'pix-code', qrCodeBase64: 'base64==' };

  it('calls POST /api/criar-pagamento with JSON body and returns response', async () => {
    mockOk(resposta);
    const result = await criarPagamento(payload);
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/criar-pagamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(resposta);
  });

  it('throws on 400 bad request', async () => {
    mockErr(400, { error: 'WhatsApp inválido' });
    await expect(criarPagamento(payload)).rejects.toThrow('WhatsApp inválido');
  });
});

// ─── statusPagamento ──────────────────────────────────────────────────────────

describe('statusPagamento', () => {
  it('calls GET /api/status-pagamento?transactionId=ID and returns status', async () => {
    mockOk({ id: 'MP_001', status: 'approved' });
    const result = await statusPagamento('MP_001');
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/status-pagamento?transactionId=MP_001`);
    expect(result).toEqual({ id: 'MP_001', status: 'approved' });
  });

  it('throws on error response', async () => {
    mockErr(400, { error: 'transactionId obrigatório' });
    await expect(statusPagamento('')).rejects.toThrow('transactionId obrigatório');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && npm test -- --testPathPattern=api.test
```

Expected: FAIL — `Cannot find module '../lib/api'`

- [ ] **Step 3: Create `frontend/src/lib/api.js`**

```js
// api.js — centralized fetch service for Pascom Drive backend.
// Base URL configured via VITE_API_BASE_URL env var.

const BASE = import.meta.env?.VITE_API_BASE_URL
  || process.env.VITE_API_BASE_URL
  || 'http://localhost:3001';

async function _request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Erro HTTP ${res.status}`);
  }
  return data;
}

/**
 * GET /api/fotos
 * @returns {Promise<Array<{id, event, url, price}>>}
 */
export async function listarFotos() {
  try {
    return await _request(`${BASE}/api/fotos`);
  } catch (err) {
    throw new Error(err.message || 'Erro ao listar fotos');
  }
}

/**
 * POST /api/criar-pagamento
 * @param {{ whatsapp: string, fotoIds: string[], total: number }} payload
 * @returns {Promise<{id: string, qrCode: string, qrCodeBase64: string}>}
 */
export async function criarPagamento(payload) {
  return _request(`${BASE}/api/criar-pagamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/status-pagamento?transactionId=ID
 * @param {string} transactionId
 * @returns {Promise<{id: string, status: string}>}
 */
export async function statusPagamento(transactionId) {
  return _request(`${BASE}/api/status-pagamento?transactionId=${transactionId}`);
}
```

> Note: Jest tests use `require()` so the dual `import.meta.env || process.env` fallback is needed.

- [ ] **Step 4: Update `jest.config.js` to handle ES module export**

Check `frontend/jest.config.js` — if `transform` uses babel-jest with `@babel/preset-env`, ES module `export` statements need to be transpiled. Confirm `frontend/babel.config.js` or `frontend/.babelrc` has `@babel/preset-env` with `modules: 'commonjs'`.

Run:
```bash
cd frontend && cat babel.config.js 2>/dev/null || cat .babelrc 2>/dev/null
```

If the output shows `modules: 'auto'` or is missing `modules`, update to `modules: 'commonjs'`:
```json
{
  "presets": [
    ["@babel/preset-env", { "targets": { "node": "current" }, "modules": "commonjs" }],
    ["@babel/preset-react", { "runtime": "automatic" }]
  ]
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd frontend && npm test -- --testPathPattern=api.test
```

Expected: 7 tests passing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.js frontend/src/__tests__/api.test.js
git commit -m "feat(frontend): add centralized API service (listarFotos, criarPagamento, statusPagamento)"
```

---

## Task 3: Connect Gallery — Update `useFotos.js`

**Files:**
- Modify: `frontend/src/hooks/useFotos.js`
- Create: `frontend/src/__tests__/useFotos.test.js`

- [ ] **Step 1: Create failing tests**

Create `frontend/src/__tests__/useFotos.test.js`:

```js
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFotos } from '../hooks/useFotos';

// Mock the api module
jest.mock('../lib/api', () => ({
  listarFotos: jest.fn(),
}));

const { listarFotos } = require('../lib/api');

const FOTOS_MOCK = [
  { id: 'F1', event: 'Missa de Páscoa', url: 'http://x/1.jpg', price: 25 },
  { id: 'F2', event: 'Missa de Páscoa', url: 'http://x/2.jpg', price: 25 },
  { id: 'F3', event: 'Batismo', url: 'http://x/3.jpg', price: 30 },
];

beforeEach(() => {
  listarFotos.mockReset();
});

describe('useFotos', () => {
  it('starts with isLoading true and empty fotos', () => {
    listarFotos.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useFotos());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.fotos).toEqual([]);
  });

  it('returns all fotos when no filter', async () => {
    listarFotos.mockResolvedValueOnce(FOTOS_MOCK);
    const { result } = renderHook(() => useFotos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fotos).toHaveLength(3);
  });

  it('filters by event when eventoSelecionado is provided', async () => {
    listarFotos.mockResolvedValueOnce(FOTOS_MOCK);
    const { result } = renderHook(() => useFotos('Batismo'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fotos).toHaveLength(1);
    expect(result.current.fotos[0].id).toBe('F3');
  });

  it('returns unique eventos list', async () => {
    listarFotos.mockResolvedValueOnce(FOTOS_MOCK);
    const { result } = renderHook(() => useFotos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eventos).toEqual(['Missa de Páscoa', 'Batismo']);
  });

  it('sets error on API failure', async () => {
    listarFotos.mockRejectedValueOnce(new Error('Sem conexão'));
    const { result } = renderHook(() => useFotos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Sem conexão');
    expect(result.current.fotos).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && npm test -- --testPathPattern=useFotos.test
```

Expected: FAIL — hook returns mock data instead of API call.

- [ ] **Step 3: Rewrite `frontend/src/hooks/useFotos.js`**

```js
// useFotos.js — fetches photos from /api/fotos and handles event filtering.
import { useState, useEffect } from 'react';
import { listarFotos as apiFotos } from '../lib/api';

export function useFotos(eventoSelecionado = null) {
  const [todasFotos, setTodasFotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiFotos()
      .then((data) => {
        if (!cancelled) setTodasFotos(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Erro ao carregar fotos');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const fotos = eventoSelecionado
    ? todasFotos.filter((f) => f.event === eventoSelecionado)
    : todasFotos;

  const eventos = [...new Set(todasFotos.map((f) => f.event))];

  return { fotos, isLoading, error, eventos };
}

// Keep default export for backward compatibility
export default useFotos;
```

- [ ] **Step 4: Update Gallery component to show error state**

Open `frontend/src/components/Gallery.jsx`. Add error rendering. Find where `isLoading` is checked and add after it:

```jsx
// Add destructuring for error:
const { fotos, isLoading, error, eventos } = useFotos(eventoSelecionado);

// Add in JSX, after the loading check:
if (error) {
  return (
    <div className="text-center py-12 text-red-600">
      <p>Não foi possível carregar as fotos.</p>
      <p className="text-sm mt-1">{error}</p>
    </div>
  );
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd frontend && npm test -- --testPathPattern=useFotos.test
```

Expected: 5 tests passing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useFotos.js frontend/src/__tests__/useFotos.test.js frontend/src/components/Gallery.jsx
git commit -m "feat(frontend): connect gallery to GET /api/fotos via real API"
```

---

## Task 4: Create `PixDisplay.jsx` Component

**Files:**
- Create: `frontend/src/components/PixDisplay.jsx`

No separate test file — simple presentational component, covered by Checkout integration tests.

- [ ] **Step 1: Create `frontend/src/components/PixDisplay.jsx`**

```jsx
// PixDisplay.jsx — shows PIX QR code image and copia-e-cola code.
import { useState } from 'react';

export function PixDisplay({ qrCodeBase64, qrCode }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(qrCode).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${qrCodeBase64}`}
          alt="QR Code PIX"
          className="w-48 h-48 border border-gray-200 rounded-lg"
        />
      )}

      <p className="text-sm text-gray-500 text-center">
        Escaneie o QR Code <span className="font-semibold">ou</span> use o código abaixo
      </p>

      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p
          className="text-xs text-gray-600 break-all font-mono select-all"
          aria-label="Código PIX"
        >
          {qrCode}
        </p>
      </div>

      <button
        onClick={copiar}
        className="w-full py-2 px-4 bg-photo-primary text-white rounded-lg font-medium
                   hover:bg-photo-primary-dark transition-colors"
      >
        {copiado ? '✅ Copiado!' : 'Copiar Código PIX'}
      </button>
    </div>
  );
}

export default PixDisplay;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PixDisplay.jsx
git commit -m "feat(frontend): add PixDisplay component with QR code and copy-paste code"
```

---

## Task 5: Create `usePollingStatus.js` Hook (TDD)

**Files:**
- Create: `frontend/src/hooks/usePollingStatus.js`
- Create: `frontend/src/__tests__/usePollingStatus.test.js`

- [ ] **Step 1: Create failing tests**

Create `frontend/src/__tests__/usePollingStatus.test.js`:

```js
import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('../lib/api', () => ({
  statusPagamento: jest.fn(),
}));

const { statusPagamento } = require('../lib/api');

// Import after mock
import { usePollingStatus } from '../hooks/usePollingStatus';

beforeEach(() => {
  jest.useFakeTimers();
  statusPagamento.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePollingStatus', () => {
  it('does not poll when transactionId is null', () => {
    renderHook(() => usePollingStatus(null));
    jest.advanceTimersByTime(10000);
    expect(statusPagamento).not.toHaveBeenCalled();
  });

  it('polls immediately on mount and every 3 seconds', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'pending' });
    renderHook(() => usePollingStatus('MP_001'));

    // Initial call on mount
    await act(async () => { await Promise.resolve(); });
    expect(statusPagamento).toHaveBeenCalledTimes(1);

    // After 3 more seconds, another call
    await act(async () => { jest.advanceTimersByTime(3000); });
    await act(async () => { await Promise.resolve(); });
    expect(statusPagamento).toHaveBeenCalledTimes(2);
  });

  it('returns status from API response', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'pending' });
    const { result } = renderHook(() => usePollingStatus('MP_001'));
    await waitFor(() => expect(result.current.status).toBe('pending'));
  });

  it('stops polling when status becomes approved', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'approved' });
    const { result } = renderHook(() => usePollingStatus('MP_001'));
    await waitFor(() => expect(result.current.status).toBe('approved'));

    const callCount = statusPagamento.mock.calls.length;
    await act(async () => { jest.advanceTimersByTime(9000); });
    // No further calls after approved
    expect(statusPagamento).toHaveBeenCalledTimes(callCount);
  });

  it('stops polling when status becomes rejected', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'rejected' });
    const { result } = renderHook(() => usePollingStatus('MP_001'));
    await waitFor(() => expect(result.current.status).toBe('rejected'));

    const callCount = statusPagamento.mock.calls.length;
    await act(async () => { jest.advanceTimersByTime(9000); });
    expect(statusPagamento).toHaveBeenCalledTimes(callCount);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && npm test -- --testPathPattern=usePollingStatus.test
```

Expected: FAIL — `Cannot find module '../hooks/usePollingStatus'`

- [ ] **Step 3: Create `frontend/src/hooks/usePollingStatus.js`**

```js
// usePollingStatus.js — polls GET /api/status-pagamento every 3 s.
// Stops when status is 'approved' or 'rejected'.
import { useState, useEffect, useRef } from 'react';
import { statusPagamento } from '../lib/api';

const INTERVAL_MS = 3000;
const TERMINAL_STATUSES = ['approved', 'rejected', 'cancelled'];

export function usePollingStatus(transactionId) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!transactionId) return;

    let stopped = false;

    async function poll() {
      if (stopped) return;
      try {
        const data = await statusPagamento(transactionId);
        if (!stopped) {
          setStatus(data.status);
          if (TERMINAL_STATUSES.includes(data.status)) {
            stopped = true;
          }
        }
      } catch (err) {
        if (!stopped) setError(err.message);
      }

      if (!stopped) {
        timerRef.current = setTimeout(poll, INTERVAL_MS);
      }
    }

    poll();

    return () => {
      stopped = true;
      clearTimeout(timerRef.current);
    };
  }, [transactionId]);

  const isPolling = transactionId && !TERMINAL_STATUSES.includes(status);

  return { status, isPolling, error };
}

export default usePollingStatus;
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd frontend && npm test -- --testPathPattern=usePollingStatus.test
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/usePollingStatus.js frontend/src/__tests__/usePollingStatus.test.js
git commit -m "feat(frontend): add usePollingStatus hook for payment status polling"
```

---

## Task 6: Update Checkout.jsx — Payment + QR + Success

**Files:**
- Modify: `frontend/src/pages/Checkout.jsx`
- Create: `frontend/src/__tests__/Checkout.test.jsx`

- [ ] **Step 1: Create failing tests**

Create `frontend/src/__tests__/Checkout.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import Checkout from '../pages/Checkout';

jest.mock('../lib/api', () => ({
  criarPagamento: jest.fn(),
}));

jest.mock('../hooks/usePollingStatus', () => ({
  usePollingStatus: jest.fn(() => ({ status: null, isPolling: false, error: null })),
}));

const { criarPagamento } = require('../lib/api');
const { usePollingStatus } = require('../hooks/usePollingStatus');

// Wrapper that pre-populates cart
function renderCheckout(cartFotos = []) {
  const TestWrapper = ({ children }) => {
    const store = require('../context/CarrinhoContext');
    return (
      <MemoryRouter>
        <store.CarrinhoProvider initialFotos={cartFotos}>
          {children}
        </store.CarrinhoProvider>
      </MemoryRouter>
    );
  };
  return render(<Checkout />, { wrapper: TestWrapper });
}

const FOTO = { id: 'F1', event: 'Missa', url: 'http://x/1.jpg', price: 25 };

beforeEach(() => {
  criarPagamento.mockReset();
  usePollingStatus.mockReturnValue({ status: null, isPolling: false, error: null });
});

describe('Checkout step 0 → 1 → 2', () => {
  it('shows selected photos on step 0', () => {
    renderCheckout([FOTO]);
    expect(screen.getByText(/Missa/i)).toBeInTheDocument();
  });

  it('advances to WhatsApp step on Continue', () => {
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i));
    expect(screen.getByPlaceholderText(/DDD/i)).toBeInTheDocument();
  });

  it('shows validation error on invalid WhatsApp', () => {
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i)); // → step 1
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '123' } });
    fireEvent.click(screen.getByText(/continuar/i));
    expect(screen.getByText(/inválido/i)).toBeInTheDocument();
  });
});

describe('Checkout step 2 — Gerar QR Pix', () => {
  it('calls criarPagamento and shows loading state', async () => {
    criarPagamento.mockReturnValue(new Promise(() => {})); // never resolves
    renderCheckout([FOTO]);
    // advance to step 2
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByText(/continuar/i));
    // now on step 2 (confirm order)
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    expect(screen.getByText(/gerando/i)).toBeInTheDocument();
    expect(criarPagamento).toHaveBeenCalledWith({
      whatsapp: '11999999999',
      fotoIds: ['F1'],
      total: expect.any(Number),
    });
  });

  it('shows QR code after successful payment creation', async () => {
    criarPagamento.mockResolvedValueOnce({
      id: 'MP_001',
      qrCode: 'pix-code-string',
      qrCodeBase64: 'base64data',
    });
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    await waitFor(() => expect(screen.getByText(/pix-code-string/i)).toBeInTheDocument());
  });

  it('shows error message when payment creation fails', async () => {
    criarPagamento.mockRejectedValueOnce(new Error('Sem conexão'));
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    await waitFor(() => expect(screen.getByText(/Sem conexão/i)).toBeInTheDocument());
  });
});

describe('Checkout step 3 — Payment status', () => {
  it('shows success when status is approved', async () => {
    usePollingStatus.mockReturnValue({ status: 'approved', isPolling: false });
    criarPagamento.mockResolvedValueOnce({ id: 'MP_001', qrCode: 'c', qrCodeBase64: 'b' });
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    await waitFor(() => screen.getByText(/Pagamento confirmado/i));
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && npm test -- --testPathPattern=Checkout.test
```

Expected: FAIL (multiple errors since step 3 is placeholder).

- [ ] **Step 3: Update `frontend/src/pages/Checkout.jsx`**

Replace the full file content with this updated version:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho';
import { checkoutSchema } from '../lib/validation';
import { criarPagamento } from '../lib/api';
import { usePollingStatus } from '../hooks/usePollingStatus';
import PixDisplay from '../components/PixDisplay';

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const STEPS = ['Fotos', 'WhatsApp', 'Confirmar', 'Pagar'];

export default function Checkout() {
  const navigate = useNavigate();
  const { fotos, clearCarrinho, totais } = useCarrinho();

  // Navigation state
  const [step, setStep] = useState(0);
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');

  // Payment state
  const [pagamento, setPagamento] = useState(null);   // { id, qrCode, qrCodeBase64 }
  const [pagandoLoading, setPagandoLoading] = useState(false);
  const [pagamentoErro, setPagamentoErro] = useState('');

  // Polling
  const { status: payStatus } = usePollingStatus(pagamento?.id || null);

  // ─── Step navigation ──────────────────────────────────────────────────────

  function avancar() {
    if (step === 1) {
      const result = checkoutSchema.safeParse({ whatsapp, fotoIds: fotos.map((f) => f.id) });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      setError('');
    }
    setStep((s) => s + 1);
  }

  function voltar() {
    setStep((s) => s - 1);
    setError('');
  }

  // ─── Criar pagamento ──────────────────────────────────────────────────────

  async function handleGerarPix() {
    setPagandoLoading(true);
    setPagamentoErro('');
    try {
      const resultado = await criarPagamento({
        whatsapp,
        fotoIds: fotos.map((f) => f.id),
        total: totais.total,
      });
      setPagamento(resultado);
      setStep(3);
    } catch (err) {
      setPagamentoErro(err.message || 'Erro ao gerar pagamento');
    } finally {
      setPagandoLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${idx < step ? 'bg-green-500 text-white' : idx === step ? 'bg-photo-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              {idx < step ? '✓' : idx + 1}
            </div>
            {idx < STEPS.length - 1 && <div className="w-6 h-0.5 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 0: Fotos selecionadas */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Fotos Selecionadas</h2>
          {fotos.length === 0 ? (
            <p className="text-gray-500">
              Nenhuma foto selecionada.{' '}
              <button onClick={() => navigate('/')} className="text-photo-primary underline">
                Voltar à galeria
              </button>
            </p>
          ) : (
            <ul className="space-y-2">
              {fotos.map((f) => (
                <li key={f.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                  <img src={f.url} alt={f.event} className="w-12 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{f.event}</p>
                    <p className="text-xs text-gray-500">{fmt(f.price)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Step 1: WhatsApp */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Seu WhatsApp</h2>
          <p className="text-sm text-gray-500 mb-3">
            Enviaremos o link das fotos para este número após o pagamento.
          </p>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            placeholder="DDD + número (ex: 11999999999)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-photo-primary"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {/* Step 2: Confirmar pedido */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Confirmar Pedido</h2>
          <p className="text-sm text-gray-500 mb-1">WhatsApp: <strong>{whatsapp}</strong></p>
          <p className="text-sm text-gray-500 mb-4">{fotos.length} foto(s) selecionada(s)</p>
          <div className="bg-gray-50 border rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span><span>{fmt(totais.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Taxa Pix (2,99% + R$0,30)</span><span>{fmt(totais.taxa)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-photo-primary">
              <span>Total</span><span>{fmt(totais.total)}</span>
            </div>
          </div>
          {pagamentoErro && (
            <p className="text-red-500 text-sm mt-3">{pagamentoErro}</p>
          )}
        </div>
      )}

      {/* Step 3: Pagar */}
      {step === 3 && (
        <div>
          {payStatus === 'approved' ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-green-600 mb-2">Pagamento confirmado!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Em breve você receberá o link das fotos no WhatsApp.
              </p>
              <button
                onClick={() => { clearCarrinho(); navigate('/'); }}
                className="bg-photo-primary text-white px-6 py-2 rounded-lg font-medium"
              >
                Voltar à galeria
              </button>
            </div>
          ) : payStatus === 'rejected' ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-red-600 mb-2">Pagamento não aprovado</h2>
              <p className="text-gray-500 text-sm mb-6">Tente novamente ou use outro método.</p>
              <button
                onClick={() => { setPagamento(null); setStep(2); }}
                className="bg-photo-primary text-white px-6 py-2 rounded-lg font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : pagamento ? (
            <div>
              <h2 className="text-xl font-bold mb-2">Pague via PIX</h2>
              <p className="text-sm text-gray-500 mb-4">
                Total: <strong>{fmt(totais.total)}</strong> — aguardando confirmação...
              </p>
              <PixDisplay qrCode={pagamento.qrCode} qrCodeBase64={pagamento.qrCodeBase64} />
              <p className="text-center text-xs text-gray-400 mt-4 animate-pulse">
                Verificando pagamento...
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8">
        {step > 0 && step < 3 && (
          <button
            onClick={voltar}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm"
          >
            Voltar
          </button>
        )}

        {step < 2 && (
          <button
            onClick={avancar}
            disabled={step === 0 && fotos.length === 0}
            className="flex-1 py-2 px-4 bg-photo-primary text-white rounded-lg text-sm font-medium
                       disabled:opacity-40"
          >
            Continuar
          </button>
        )}

        {step === 2 && (
          <button
            onClick={handleGerarPix}
            disabled={pagandoLoading}
            className="flex-1 py-2 px-4 bg-photo-primary text-white rounded-lg text-sm font-medium
                       disabled:opacity-70"
          >
            {pagandoLoading ? 'Gerando...' : 'Gerar QR Pix'}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `CarrinhoContext.jsx` to support `initialFotos` prop for testing**

Open `frontend/src/context/CarrinhoContext.jsx`. Find the `CarrinhoProvider` function signature. Add `initialFotos` support:

```jsx
// BEFORE:
export function CarrinhoProvider({ children }) {
  const [state, dispatch] = useReducer(carrinhoReducer, { fotos: [] });

// AFTER:
export function CarrinhoProvider({ children, initialFotos = [] }) {
  const [state, dispatch] = useReducer(carrinhoReducer, { fotos: initialFotos });
```

- [ ] **Step 5: Run Checkout tests — expect PASS**

```bash
cd frontend && npm test -- --testPathPattern=Checkout.test
```

Expected: All tests passing.

- [ ] **Step 6: Run full test suite**

```bash
cd frontend && npm test
```

Expected: All tests passing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Checkout.jsx frontend/src/components/PixDisplay.jsx \
        frontend/src/context/CarrinhoContext.jsx \
        frontend/src/__tests__/Checkout.test.jsx
git commit -m "feat(frontend): connect checkout to MP payment API — QR code + status polling"
```

---

## Task 7: Integration Smoke Test (Manual)

No code changes — verify end-to-end with both servers running.

- [ ] **Step 1: Start backend**

```bash
cd backend && node server.js
```

Expected: `Servidor rodando na porta 3001`

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

Expected: `Local: http://localhost:5173`

- [ ] **Step 3: Verify CORS**

Open http://localhost:5173 in browser. Open DevTools → Network tab. Navigate to gallery.

Expected: `GET http://localhost:3001/api/fotos` returns 200. No CORS errors in console.

If CORS error appears: update `backend/.env` → `FRONTEND_URL=http://localhost:5173` and restart backend.

- [ ] **Step 4: Gallery loads real photos**

Expected: Gallery shows photos fetched from Google Sheets (or empty state if no photos with `Status='Processada'` yet).

If Google Sheets is empty, manually add a test row:
- Sheet "Fotos", row 2: `FOTO_001 | Missa Teste | [link] | [amostra_link] | Processada | | 25`

- [ ] **Step 5: Checkout flow with sandbox payment**

1. Select a photo → click "Proceder para Pagamento"
2. Step 0: confirm photos shown
3. Step 1: enter WhatsApp `11999999999` → Continue
4. Step 2: review summary → click "Gerar QR Pix"
5. Step 3: QR Code appears with PIX copia-e-cola code

Expected: QR code image renders. PIX code is a valid string (starts with `00020126`).

- [ ] **Step 6: Verify Google Sheets row created**

Open the Google Spreadsheet. Check "Fotos" sheet for new row with:
- `ID`: `PEDIDO_<timestamp>`
- `Status`: `Pagamento Pendente`
- `WhatsApp`: `11999999999`
- `ID_Mercado_Pago`: non-empty string

- [ ] **Step 7: Final commit + push**

```bash
git add .
git commit -m "test(integration): Phase 4 smoke test passed — gallery and checkout connected"
git push origin phase-4/frontend-backend-integration
```

---

## Verification

**Automated:**
```bash
cd frontend && npm test         # All suites green
cd backend && npm test          # All suites green
```

**Manual checklist:**
- [ ] `GET /api/fotos` returns 200 in browser network tab
- [ ] Gallery renders real photos (or graceful empty state)
- [ ] Checkout step 1→2 validates WhatsApp
- [ ] "Gerar QR Pix" calls `POST /api/criar-pagamento`
- [ ] QR code image and PIX code display in step 3
- [ ] Google Sheets shows new `PEDIDO_` row after checkout
- [ ] Poll animation visible while status is `pending`
- [ ] `✅ Pagamento confirmado` shows when payment approved (test via Mercado Pago sandbox dashboard)
