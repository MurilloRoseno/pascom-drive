jest.mock('../lib/google-sheets', () => ({
  registrarWebhookSeNovo: jest.fn(),
  finalizarWebhook: jest.fn(),
  atualizarPedidoPagamento: jest.fn(),
  buscarPedidoByPreferenceOrPayment: jest.fn(),
  registrarEntrega: jest.fn(),
}));
jest.mock('../lib/mercado-pago', () => ({
  validarAssinaturaWebhook: jest.fn(),
  consultarPagamento: jest.fn(),
}));
jest.mock('../lib/delivery', () => ({
  criarDownloadsDoPedido: jest.fn(),
  enviarEmailEntrega: jest.fn(),
  criarMensagemWhatsApp: jest.fn(() => 'Links seguros'),
}));

process.env.MP_WEBHOOK_SECRET = 'webhook-secret';

const request = require('supertest');
const express = require('express');
const handler = require('../api/webhook/mercado-pago');
const sheets = require('../lib/google-sheets');
const mp = require('../lib/mercado-pago');
const delivery = require('../lib/delivery');

const app = express();
app.use(express.json());
app.post('/api/webhook/mercado-pago', handler);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MP_WEBHOOK_SECRET = 'webhook-secret';
  mp.validarAssinaturaWebhook.mockReturnValue(true);
  mp.consultarPagamento.mockResolvedValue({ id: 'PAY_1', status: 'approved', external_reference: 'PED_1' });
  sheets.registrarWebhookSeNovo.mockResolvedValue(true);
  sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue({ id: 'PED_1' });
  sheets.atualizarPedidoPagamento.mockResolvedValue({ id: 'PED_1', email: 'maria@example.com', whatsapp: '99982061089' });
  delivery.criarDownloadsDoPedido.mockResolvedValue([{ url: 'https://safe.test/download' }]);
  delivery.enviarEmailEntrega.mockResolvedValue(true);
});

function post() {
  return request(app).post('/api/webhook/mercado-pago')
    .set('x-signature', 'ts=1,v1=signature')
    .set('x-request-id', 'REQ_1')
    .send({ action: 'payment.updated', data: { id: 'PAY_1' } });
}

it('valida assinatura, consulta pagamento e libera entrega aprovada', async () => {
  const res = await post();
  expect(res.status).toBe(200);
  expect(mp.validarAssinaturaWebhook).toHaveBeenCalled();
  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalled();
  expect(sheets.registrarEntrega).toHaveBeenCalledWith('PED_1', expect.objectContaining({ emailSent: true }));
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('REQ_1:PAY_1:payment.updated', 'Processado');
});

it('descarta evento ja processado sem duplicar entrega', async () => {
  sheets.registrarWebhookSeNovo.mockResolvedValueOnce(false);
  const res = await post();
  expect(res.body.duplicate).toBe(true);
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
});

it('recusa notificacao sem assinatura valida', async () => {
  mp.validarAssinaturaWebhook.mockReturnValueOnce(false);
  expect((await post()).status).toBe(401);
});
