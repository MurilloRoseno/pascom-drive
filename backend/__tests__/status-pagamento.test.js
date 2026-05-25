jest.mock('../lib/google-sheets', () => ({
  buscarPedidoById: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const handler = require('../api/status-pagamento');
const sheets = require('../lib/google-sheets');

const app = express();
app.all('/api/status-pagamento', handler);

beforeEach(() => {
  jest.clearAllMocks();
  sheets.buscarPedidoById.mockResolvedValue({ id: 'PED_EXEMPLO_01', status: 'Pagamento Confirmado', total: 13.5 });
});

it('consulta pedido por identificador opaco', async () => {
  const res = await request(app).get('/api/status-pagamento?pedidoId=PED_EXEMPLO_01');
  expect(res.status).toBe(200);
  expect(res.body.deliveryReady).toBe(true);
  expect(sheets.buscarPedidoById).toHaveBeenCalledWith('PED_EXEMPLO_01');
});

it('exige pedidoId e nao dados pessoais no query string', async () => {
  expect((await request(app).get('/api/status-pagamento')).status).toBe(400);
});

it('responde 404 para pedido inexistente', async () => {
  sheets.buscarPedidoById.mockResolvedValueOnce(null);
  expect((await request(app).get('/api/status-pagamento?pedidoId=PED_DESCONHECIDO')).status).toBe(404);
});
