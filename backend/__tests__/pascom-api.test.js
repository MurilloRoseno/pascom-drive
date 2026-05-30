jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, _res, next) => {
    req.auth = () => ({ userId: global.__clerkUserId || null });
    next();
  }),
  getAuth: jest.fn((req) => req.auth()),
  clerkClient: { users: { getUser: jest.fn() } },
}));

jest.mock('../lib/google-sheets.shared', () => ({
  rows: jest.fn(),
  yes: jest.requireActual('../lib/google-sheets.shared').yes,
}));

jest.mock('../lib/google-sheets', () => ({
  dashboardPascom: jest.fn(),
  listarPedidosPascom: jest.fn(),
  detalharPedidoPascom: jest.fn(),
  buscarPedidoById: jest.fn(),
}));

jest.mock('../lib/delivery', () => ({
  criarDownloadsDoPedido: jest.fn(),
  criarMensagemWhatsApp: jest.fn(() => 'mensagem'),
}));

const request = require('supertest');
const { clerkClient } = require('@clerk/express');
const shared = require('../lib/google-sheets.shared');
const sheets = require('../lib/google-sheets');
const delivery = require('../lib/delivery');

function row(data) {
  return {
    get: (key) => data[key],
    set: jest.fn(),
    save: jest.fn().mockResolvedValue(),
  };
}

const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CLERK_SECRET_KEY = 'sk_test_123';
  global.__clerkUserId = 'user_123';
  clerkClient.users.getUser.mockResolvedValue({
    fullName: 'Equipe',
    emailAddresses: [{ emailAddress: 'pascom@paroquia.test' }],
    phoneNumbers: [],
  });
  shared.rows.mockResolvedValue([row({ Identificador: 'pascom@paroquia.test', Tipo: 'email', Nome: 'Pascom', Role: 'admin', Ativo: 'SIM' })]);
  sheets.dashboardPascom.mockResolvedValue({ ordersToday: 1, revenueToday: 10 });
  sheets.listarPedidosPascom.mockResolvedValue([{ id: 'PED_1', status: 'Pagamento Confirmado', total: 10 }]);
  sheets.detalharPedidoPascom.mockResolvedValue({ pedido: { id: 'PED_1' }, itens: [], downloads: [] });
  sheets.buscarPedidoById.mockResolvedValue({ id: 'PED_1', status: 'Pagamento Confirmado' });
  delivery.criarDownloadsDoPedido.mockResolvedValue([{ fotoId: 'F1', url: '/api/download?token=t', expiresAt: '2026-05-30T00:00:00.000Z' }]);
});

afterEach(() => {
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.CLERK_AUTHORIZED_PARTIES;
});

it('rejeita rotas Pascom sem Clerk configurado', async () => {
  delete process.env.CLERK_SECRET_KEY;
  const response = await request(app).get('/api/pascom/me');
  expect(response.status).toBe(503);
});

it('rejeita sessao ausente', async () => {
  global.__clerkUserId = null;
  const response = await request(app).get('/api/pascom/me');
  expect(response.status).toBe(401);
});

it('rejeita usuario fora da EquipePascom', async () => {
  shared.rows.mockResolvedValue([]);
  const response = await request(app).get('/api/pascom/me');
  expect(response.status).toBe(403);
});

it('retorna dashboard e lista de pedidos para usuario autorizado', async () => {
  const me = await request(app).get('/api/pascom/me');
  const dashboard = await request(app).get('/api/pascom/dashboard');
  const pedidos = await request(app).get('/api/pascom/pedidos?q=PED');

  expect(me.status).toBe(200);
  expect(dashboard.body.dashboard.ordersToday).toBe(1);
  expect(pedidos.body.pedidos[0].id).toBe('PED_1');
});

it('regenera downloads somente para pedido aprovado', async () => {
  const response = await request(app).post('/api/pascom/pedidos/PED_1/regenerar-downloads');
  expect(response.status).toBe(200);
  expect(response.body.downloads[0].fotoId).toBe('F1');
});

it('bloqueia regeneracao de pedido pendente', async () => {
  sheets.buscarPedidoById.mockResolvedValue({ id: 'PED_2', status: 'Pagamento Pendente' });
  const response = await request(app).post('/api/pascom/pedidos/PED_2/regenerar-downloads');
  expect(response.status).toBe(409);
});
