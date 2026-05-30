/* global global, process */
global.fetch = jest.fn();
process.env.VITE_API_BASE_URL = 'http://localhost:3001';

const { cotarCheckout, criarPagamento, pascomPedidos, pascomRegenerarDownloads, statusPagamento } = require('../lib/api');
const BASE = 'http://localhost:3001';

beforeEach(() => fetch.mockReset());

function mockOk(body) {
  fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });
}

describe('api comercial', () => {
  it('solicita cotacao do servidor e cria preferencia Checkout Pro', async () => {
    const payload = { fotoIds: ['F1'], paymentMethod: 'pix', galleryTokens: {} };
    mockOk({ pricing: { total: 13.5 } });
    await cotarCheckout(payload);
    expect(fetch).toHaveBeenLastCalledWith(`${BASE}/api/checkout/quote`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }));

    mockOk({ pedidoId: 'PED_1', checkoutUrl: 'https://mercadopago.test' });
    await criarPagamento(payload);
    expect(fetch).toHaveBeenLastCalledWith(`${BASE}/api/checkout/preference`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }));
  });

  it('consulta retorno pelo identificador opaco do pedido', async () => {
    mockOk({ id: 'PED_1', status: 'Pendente' });
    await statusPagamento('PED_1');
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/status-pagamento?pedidoId=PED_1`, undefined);
  });

  it('envia token Clerk nas APIs Pascom', async () => {
    mockOk({ pedidos: [] });
    await pascomPedidos('clerk-token', { q: 'PED_1', status: 'Pagamento Confirmado' });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/pascom/pedidos?q=PED_1&status=Pagamento+Confirmado`,
      { headers: { Authorization: 'Bearer clerk-token' } },
    );

    mockOk({ downloads: [] });
    await pascomRegenerarDownloads('clerk-token', 'PED_1');
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/pascom/pedidos/PED_1/regenerar-downloads`,
      { method: 'POST', headers: { Authorization: 'Bearer clerk-token' } },
    );
  });
});
