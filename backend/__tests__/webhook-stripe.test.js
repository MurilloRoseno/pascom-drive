jest.mock('../lib/google-sheets', () => ({
  registrarWebhookSeNovo: jest.fn(),
  finalizarWebhook: jest.fn(),
  atualizarPedidoPagamento: jest.fn(),
  marcarPedidoDivergente: jest.fn(),
  buscarPedidoByPreferenceOrPayment: jest.fn(),
  registrarEntrega: jest.fn(),
  buscarDoacaoById: jest.fn(),
  atualizarDoacao: jest.fn(),
  registrarDoacao: jest.fn(),
}));
jest.mock('../lib/stripe', () => ({
  construirEventoWebhook: jest.fn(),
}));
jest.mock('../lib/delivery', () => ({
  criarDownloadsDoPedido: jest.fn(),
  enviarEmailEntrega: jest.fn(),
  criarMensagemWhatsApp: jest.fn(() => 'Links seguros'),
}));

const request = require('supertest');
const express = require('express');
const handler = require('../api/webhook/stripe');
const sheets = require('../lib/google-sheets');
const stripe = require('../lib/stripe');
const delivery = require('../lib/delivery');

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.post('/api/webhook/stripe', handler);

function sessionEvent(type = 'checkout.session.completed', overrides = {}) {
  return {
    id: 'evt_1',
    type,
    data: {
      object: {
        id: 'cs_test_1',
        payment_intent: 'pi_1',
        client_reference_id: 'PED_1',
        payment_status: 'paid',
        amount_total: 1012,
        currency: 'brl',
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  stripe.construirEventoWebhook.mockReturnValue(sessionEvent());
  sheets.registrarWebhookSeNovo.mockResolvedValue(true);
  sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue({ id: 'PED_1', total: 10.12, status: 'Pagamento Pendente' });
  sheets.atualizarPedidoPagamento.mockResolvedValue({ id: 'PED_1', email: 'maria@example.com', whatsapp: '99982061089' });
  delivery.criarDownloadsDoPedido.mockResolvedValue([{ url: 'https://safe.test/download' }]);
  delivery.enviarEmailEntrega.mockResolvedValue({ status: 'enviado', error: '', attemptedAt: '2026-05-26T12:00:00.000Z' });
});

function post() {
  return request(app).post('/api/webhook/stripe').set('stripe-signature', 't=1,v1=signature').send({ id: 'evt_1' });
}

it('valida assinatura com o corpo bruto e libera entrega aprovada', async () => {
  const res = await post();
  expect(res.status).toBe(200);
  expect(stripe.construirEventoWebhook).toHaveBeenCalledWith({
    rawBody: JSON.stringify({ id: 'evt_1' }),
    signature: 't=1,v1=signature',
    secret: 'whsec_test',
  });
  expect(sheets.atualizarPedidoPagamento).toHaveBeenCalledWith('PED_1', { id: 'pi_1', status: 'approved' });
  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalled();
  expect(sheets.registrarEntrega).toHaveBeenCalledWith('PED_1', expect.objectContaining({
    emailResult: expect.objectContaining({ status: 'enviado' }),
    whatsappLink: expect.stringContaining('https://wa.me/5599982061089'),
  }));
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'Processado');
});

it('recusa assinatura invalida sem tocar no pedido', async () => {
  stripe.construirEventoWebhook.mockReturnValueOnce(null);
  const res = await post();
  expect(res.status).toBe(401);
  expect(sheets.registrarWebhookSeNovo).not.toHaveBeenCalled();
  expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
});

it('responde 500 sem segredo configurado', async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const res = await post();
  expect(res.status).toBe(500);
});

it('ignora evento duplicado', async () => {
  sheets.registrarWebhookSeNovo.mockResolvedValueOnce(false);
  const res = await post();
  expect(res.body).toEqual({ ok: true, duplicate: true });
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
});

it('ignora tipos de evento que nao sao de checkout', async () => {
  stripe.construirEventoWebhook.mockReturnValueOnce({ id: 'evt_2', type: 'charge.updated', data: { object: {} } });
  const res = await post();
  expect(res.body).toEqual({ ok: true, ignored: true });
  expect(sheets.registrarWebhookSeNovo).not.toHaveBeenCalled();
});

it('marca divergencia quando o valor pago difere do pedido', async () => {
  stripe.construirEventoWebhook.mockReturnValueOnce(sessionEvent('checkout.session.completed', { amount_total: 100 }));
  const res = await post();
  expect(res.status).toBe(202);
  expect(sheets.marcarPedidoDivergente).toHaveBeenCalledWith('PED_1', expect.stringMatching(/Stripe/), expect.objectContaining({ id: 'pi_1' }));
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'PagamentoDivergente');
});

it('nao entrega enquanto o Pix ainda nao foi pago', async () => {
  stripe.construirEventoWebhook.mockReturnValueOnce(sessionEvent('checkout.session.completed', { payment_status: 'unpaid' }));
  const res = await post();
  expect(res.status).toBe(200);
  expect(sheets.atualizarPedidoPagamento).toHaveBeenCalledWith('PED_1', { id: 'pi_1', status: 'pending' });
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
});

it('entrega quando o pagamento assincrono e confirmado', async () => {
  stripe.construirEventoWebhook.mockReturnValueOnce(sessionEvent('checkout.session.async_payment_succeeded', { payment_status: 'paid' }));
  await post();
  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalled();
});

it('nao rebaixa pedido ja confirmado quando a sessao expira', async () => {
  stripe.construirEventoWebhook.mockReturnValueOnce(sessionEvent('checkout.session.expired', { payment_status: 'unpaid' }));
  sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValueOnce({ id: 'PED_1', total: 10.12, status: 'Pagamento Confirmado' });
  const res = await post();
  expect(res.status).toBe(200);
  expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
});

it('desvia eventos de doacao para o fluxo proprio, sem entregar fotos', async () => {
  stripe.construirEventoWebhook.mockReturnValueOnce(sessionEvent('checkout.session.completed', {
    client_reference_id: 'DOA_1', metadata: { tipo: 'doacao', doacao_id: 'DOA_1' },
  }));
  sheets.buscarDoacaoById.mockResolvedValue(null);
  const res = await post();
  expect(res.status).toBe(202);
  expect(sheets.buscarPedidoByPreferenceOrPayment).not.toHaveBeenCalled();
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'DoacaoNaoEncontrada');
});

it('registra pedido nao encontrado', async () => {
  sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValueOnce(null);
  const res = await post();
  expect(res.status).toBe(202);
  expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'PedidoNaoEncontrado');
});
