jest.mock('../lib/google-sheets', () => ({
  registrarWebhookSeNovo: jest.fn(),
  finalizarWebhook: jest.fn(),
  atualizarPedidoPagamento: jest.fn(),
  marcarPedidoDivergente: jest.fn(),
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
  criarLinkWhatsApp: jest.fn(() => 'https://wa.me/5599982061089?text=Links%20seguros'),
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
  mp.consultarPagamento.mockResolvedValue({
    id: 'PAY_1',
    status: 'approved',
    external_reference: 'PED_1',
    transaction_amount: 12,
    currency_id: 'BRL',
  });
  sheets.registrarWebhookSeNovo.mockResolvedValue(true);
  sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue({ id: 'PED_1', total: 12 });
  sheets.atualizarPedidoPagamento.mockResolvedValue({ id: 'PED_1', email: 'maria@example.com', whatsapp: '99982061089' });
  delivery.criarDownloadsDoPedido.mockResolvedValue([{ url: 'https://safe.test/download' }]);
  delivery.enviarEmailEntrega.mockResolvedValue({ status: 'enviado', error: '', attemptedAt: '2026-05-26T12:00:00.000Z' });
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
  expect(sheets.registrarEntrega).toHaveBeenCalledWith('PED_1', expect.objectContaining({
    emailResult: expect.objectContaining({ status: 'enviado' }),
  }));
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('REQ_1:PAY_1:payment.updated', 'Processado');
});

it('registra WhatsApp e conclui webhook mesmo quando o SMTP falha', async () => {
  delivery.enviarEmailEntrega.mockResolvedValueOnce({
    status: 'falhou',
    error: 'SMTP indisponivel',
    attemptedAt: '2026-05-26T12:00:00.000Z',
  });

  const res = await post();

  expect(res.status).toBe(200);
  expect(sheets.registrarEntrega).toHaveBeenCalledWith('PED_1', expect.objectContaining({
    emailResult: expect.objectContaining({ status: 'falhou' }),
    whatsappLink: expect.stringContaining('wa.me'),
  }));
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

it('marca divergencia e nao libera downloads quando valor aprovado nao bate', async () => {
  mp.consultarPagamento.mockResolvedValueOnce({
    id: 'PAY_1',
    status: 'approved',
    external_reference: 'PED_1',
    transaction_amount: 1,
    currency_id: 'BRL',
  });

  const res = await post();

  expect(res.status).toBe(202);
  expect(res.body.divergent).toBe(true);
  expect(sheets.marcarPedidoDivergente).toHaveBeenCalledWith(
    'PED_1',
    'Valor ou moeda divergente no Mercado Pago',
    expect.objectContaining({ id: 'PAY_1' })
  );
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('REQ_1:PAY_1:payment.updated', 'PagamentoDivergente');
});

it('marca divergencia e nao libera downloads quando moeda nao e BRL', async () => {
  mp.consultarPagamento.mockResolvedValueOnce({
    id: 'PAY_1',
    status: 'approved',
    external_reference: 'PED_1',
    transaction_amount: 12,
    currency_id: 'USD',
  });

  const res = await post();

  expect(res.status).toBe(202);
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  expect(sheets.marcarPedidoDivergente).toHaveBeenCalled();
});

it('deixa a entrega para a conciliacao quando ela falha depois do pagamento confirmado', async () => {
  delivery.criarDownloadsDoPedido.mockRejectedValueOnce(new Error('Segredo de download nao configurado.'));

  const res = await post();

  expect(res.status).toBe(200);
  expect(res.body.entregaPendente).toBe(true);
  expect(sheets.atualizarPedidoPagamento).toHaveBeenCalled();
  expect(sheets.registrarEntrega).toHaveBeenCalledWith('PED_1', expect.objectContaining({
    emailResult: expect.objectContaining({ status: 'pendente' }),
    tentativas: 0,
    proximaEm: expect.any(String),
  }));
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('REQ_1:PAY_1:payment.updated', 'EntregaPendente');
});
