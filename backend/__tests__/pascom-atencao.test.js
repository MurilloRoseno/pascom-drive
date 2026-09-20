jest.mock('../lib/google-sheets.shared', () => ({
  ...jest.requireActual('../lib/google-sheets.shared'),
  rows: jest.fn(),
}));

const shared = require('../lib/google-sheets.shared');
const { dashboardPascom, listarPedidosPascom } = require('../lib/google-sheets.pascom');

const AGORA = Date.now();
const UMA_HORA = 60 * 60 * 1000;

function row(data) {
  return { get: (key) => data[key] };
}

function pedido(overrides = {}) {
  return row({
    PedidoID: 'PED_1',
    Status: 'Pagamento Confirmado',
    Email: 'maria@example.com',
    Total: 12,
    DataCriacao: new Date(AGORA - 2 * UMA_HORA).toISOString(),
    DataPagamento: new Date(AGORA - UMA_HORA).toISOString(),
    EmailStatus: 'enviado',
    ...overrides,
  });
}

let tabelas;

beforeEach(() => {
  jest.clearAllMocks();
  tabelas = { Pedidos: [], Downloads: [], Eventos: [], ItensPedido: [], Fotos: [] };
  shared.rows.mockImplementation(async (nome) => tabelas[nome] || []);
});

it('conta entregas com problema a partir do status que o codigo realmente grava', async () => {
  tabelas.Pedidos = [
    pedido({ PedidoID: 'PED_OK' }),
    pedido({ PedidoID: 'PED_EMAIL', EmailStatus: 'falhou', EmailErro: 'Gmail bloqueou', EntregaTentativas: 3 }),
    pedido({ PedidoID: 'PED_SEM_LINK' }),
    pedido({ PedidoID: 'PED_DIVERGENTE', Status: 'PagamentoDivergente' }),
  ];
  tabelas.Downloads = [
    row({ PedidoID: 'PED_OK', ExpiraEm: new Date(AGORA + UMA_HORA).toISOString(), Usos: 0, UsosMaximos: 5 }),
    row({ PedidoID: 'PED_EMAIL', ExpiraEm: new Date(AGORA + UMA_HORA).toISOString(), Usos: 0, UsosMaximos: 5 }),
    row({ PedidoID: 'PED_DIVERGENTE', ExpiraEm: new Date(AGORA + UMA_HORA).toISOString(), Usos: 0, UsosMaximos: 5 }),
  ];

  const dashboard = await dashboardPascom();

  // Antes contava emailStatus === 'erro', valor que nunca era gravado: ficava sempre zero.
  expect(dashboard.deliveryIssues).toBe(3);
  expect(dashboard.resumoAtencao).toEqual({ erros: 3, avisos: 0 });
  expect(dashboard.atencao.map((item) => item.tipo).sort()).toEqual([
    'email_falhou', 'pagamento_divergente', 'pago_sem_entrega',
  ]);
  expect(dashboard.atencao[0]).toEqual(expect.objectContaining({
    severidade: 'erro',
    email: 'maria@example.com',
    total: 12,
  }));
});

it('pedido entregue direito nao aparece em atencao', async () => {
  tabelas.Pedidos = [pedido()];
  tabelas.Downloads = [row({ PedidoID: 'PED_1', ExpiraEm: new Date(AGORA + UMA_HORA).toISOString(), Usos: 1, UsosMaximos: 5 })];

  const dashboard = await dashboardPascom();

  expect(dashboard.atencao).toEqual([]);
  expect(dashboard.deliveryIssues).toBe(0);
  expect(dashboard.activeDownloads).toBe(1);
});

it('a lista aceita o filtro "so os que precisam de atencao"', async () => {
  tabelas.Pedidos = [
    pedido({ PedidoID: 'PED_OK' }),
    pedido({ PedidoID: 'PED_SEM_LINK' }),
  ];
  tabelas.Downloads = [row({ PedidoID: 'PED_OK', ExpiraEm: new Date(AGORA + UMA_HORA).toISOString(), Usos: 0, UsosMaximos: 5 })];

  const todos = await listarPedidosPascom({});
  const atencao = await listarPedidosPascom({ atencao: 'true' });

  expect(todos.map((item) => item.id).sort()).toEqual(['PED_OK', 'PED_SEM_LINK']);
  expect(atencao.map((item) => item.id)).toEqual(['PED_SEM_LINK']);
});

it('o pedido expoe o estado da entrega para o painel', async () => {
  tabelas.Pedidos = [pedido({
    EmailStatus: 'falhou',
    EmailErro: 'Gmail bloqueou',
    EmailUltimaTentativaEm: '2026-09-19T12:00:00.000Z',
    EntregaTentativas: 2,
    EntregaProximaEm: '2026-09-19T12:20:00.000Z',
    PaymentID: 'PAY_9',
    MeioPagamento: 'pix',
  })];

  const [item] = await listarPedidosPascom({});

  expect(item).toEqual(expect.objectContaining({
    emailStatus: 'falhou',
    emailError: 'Gmail bloqueou',
    emailAttemptedAt: '2026-09-19T12:00:00.000Z',
    deliveryAttempts: 2,
    deliveryNextAt: '2026-09-19T12:20:00.000Z',
    paymentId: 'PAY_9',
    paymentMethod: 'pix',
  }));
});
