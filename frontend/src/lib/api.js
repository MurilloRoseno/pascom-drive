// api.js — centralized fetch service for Pascom Drive backend.
// Base URL: VITE_API_BASE_URL env var (set to http://localhost:3001 for dev).
// In tests, set process.env.VITE_API_BASE_URL before importing this module.

const BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function _request(url, options) {
  const res = options ? await fetch(url, options) : await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Erro HTTP ${res.status}`);
  }
  return data;
}

/**
 * GET /api/fotos
 * @returns {Promise<Array<{id: string, event: string, url: string, price: number}>>}
 */
export async function listarFotos() {
  try {
    return await _request(`${BASE}/api/fotos`);
  } catch (err) {
    const msg = err.message;
    // Re-throw specific backend messages; use generic for generic HTTP errors
    throw new Error(msg && !msg.startsWith('Erro HTTP') ? msg : 'Erro ao listar fotos');
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
