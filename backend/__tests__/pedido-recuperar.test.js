jest.mock('../lib/google-sheets', () => ({
  buscarPedidoById: jest.fn(),
  listarItensPedido: jest.fn(),
}));
jest.mock('../lib/delivery', () => ({
  criarDownloadsDoPedido: jest.fn(),
  criarMensagemWhatsApp: jest.fn(() => 'mensagem whatsapp'),
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const handler = require('../api/pedido-recuperar');
const sheets = require('../lib/google-sheets');
const delivery = require('../lib/delivery');

const app = express();
app.use(express.json());
app.all('/api/pedidos/recuperar', handler);
app.use(errorHandler);

beforeEach(() => {
  jest.clearAllMocks();
  sheets.listarItensPedido.mockResolvedValue([{ fotoId: 'F1', eventoId: 'EV1' }]);
});

it('recupera pedido confirmado e regenera links seguros', async () => {
  sheets.buscarPedidoById.mockResolvedValue({
    id: 'PED_123456',
    email: 'maria@example.com',
    status: 'Pagamento Confirmado',
    total: 13.5,
  });
  delivery.criarDownloadsDoPedido.mockResolvedValue([{ fotoId: 'F1', url: 'https://app/download', exp: Date.now() + 1000 }]);
  const res = await request(app).post('/api/pedidos/recuperar').send({ email: 'maria@example.com', pedidoId: 'PED_123456' });
  expect(res.status).toBe(200);
  expect(res.body.deliveryReady).toBe(true);
  expect(res.body.downloads).toHaveLength(1);
});

it('recusa e-mail que nao pertence ao pedido', async () => {
  sheets.buscarPedidoById.mockResolvedValue({ id: 'PED_123456', email: 'maria@example.com', status: 'Pagamento Confirmado' });
  const res = await request(app).post('/api/pedidos/recuperar').send({ email: 'outra@example.com', pedidoId: 'PED_123456' });
  expect(res.status).toBe(404);
});
