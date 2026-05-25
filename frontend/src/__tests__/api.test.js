/* global global, process */
global.fetch = jest.fn();
process.env.VITE_API_BASE_URL = 'http://localhost:3001';

const { listarFotos, cotarCheckout, criarPagamento, statusPagamento } = require('../lib/api');
const BASE = 'http://localhost:3001';

beforeEach(() => fetch.mockReset());

function mockOk(body) {
  fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });
}

describe('api comercial', () => {
  it('preserva consulta legada apenas para previews publicas', async () => {
    mockOk([{ id: 'F1' }]);
    await listarFotos();
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/fotos`, undefined);
  });

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
});
