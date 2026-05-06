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
