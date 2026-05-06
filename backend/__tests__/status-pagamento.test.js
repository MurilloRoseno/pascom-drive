jest.mock('../lib/mercado-pago', () => ({
  consultarStatus: jest.fn().mockResolvedValue({ id: 'MP_123', status: 'pending' }),
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const statusHandler = require('../api/status-pagamento');

const app = express();
app.use(express.json());
app.all('/api/status-pagamento', statusHandler);
app.use(errorHandler);

describe('GET /api/status-pagamento', () => {
  it('retorna 200 com status', async () => {
    const res = await request(app).get('/api/status-pagamento?transactionId=MP_123');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  it('retorna 400 sem transactionId', async () => {
    const res = await request(app).get('/api/status-pagamento');
    expect(res.status).toBe(400);
  });

  it('rejeita POST com 405', async () => {
    const res = await request(app).post('/api/status-pagamento');
    expect(res.status).toBe(405);
  });
});
