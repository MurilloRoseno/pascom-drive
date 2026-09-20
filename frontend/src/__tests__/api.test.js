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

  it('envia acoes de evento para a rota Pascom com o evento codificado', async () => {
    const { pascomEventoAcao, pascomEventos } = require('../lib/api');
    mockOk({ eventos: [] });
    await pascomEventos('clerk-token');
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/pascom/eventos`, { headers: { Authorization: 'Bearer clerk-token' } });

    mockOk({ evento: {} });
    await pascomEventoAcao('clerk-token', 'EV 1', { acao: 'publicar' });
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/pascom/eventos/EV%201/acoes`, {
      method: 'POST',
      headers: { Authorization: 'Bearer clerk-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'publicar' }),
    });
  });
});

describe('api sistema Pascom', () => {
  it('consulta o diagnostico e a estimativa de liberacao com token Clerk', async () => {
    const { pascomEstimarLiberacao, pascomSistema } = require('../lib/api');
    mockOk({ itens: [] });
    await pascomSistema('clerk-token');
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/pascom/sistema`, { headers: { Authorization: 'Bearer clerk-token' } });

    mockOk({ arquivos: 0 });
    await pascomEstimarLiberacao('clerk-token', 'EV 2');
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/pascom/eventos/EV%202/liberacao`, { headers: { Authorization: 'Bearer clerk-token' } });
  });
});

describe('api quarentena Pascom', () => {
  it('reprocessa e corrige o nome de pastas em quarentena', async () => {
    const { pascomCorrigirNomePasta, pascomReprocessarPasta } = require('../lib/api');
    mockOk({});
    await pascomReprocessarPasta('clerk-token', 'pasta 1');
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/pascom/quarentena/pasta%201/reprocessar`, expect.objectContaining({ method: 'POST' }));
    mockOk({});
    await pascomCorrigirNomePasta('clerk-token', 'p1', { categoria: 'crisma', data: '2026-06-01', titulo: 'Turma', extra: 'x' });
    expect(fetch).toHaveBeenLastCalledWith(`${BASE}/api/pascom/quarentena/p1/nome`, expect.objectContaining({
      body: JSON.stringify({ categoria: 'crisma', data: '2026-06-01', titulo: 'Turma' }),
    }));
  });
});

describe('api entregas Pascom', () => {
  it('reenvia a entrega e confere o pagamento no Mercado Pago', async () => {
    const { pascomConferirMercadoPago, pascomReenviarEntrega } = require('../lib/api');
    mockOk({ emailStatus: 'enviado' });
    await pascomReenviarEntrega('clerk-token', 'PED 1');
    expect(fetch).toHaveBeenLastCalledWith(`${BASE}/api/pascom/pedidos/PED%201/reenviar-entrega`, expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer clerk-token', 'Content-Type': 'application/json' },
    }));

    mockOk({ situacao: 'aguardando' });
    await pascomConferirMercadoPago('clerk-token', 'PED_2');
    expect(fetch).toHaveBeenLastCalledWith(`${BASE}/api/pascom/pedidos/PED_2/conferir-mp`, expect.objectContaining({ method: 'POST' }));
  });
});
