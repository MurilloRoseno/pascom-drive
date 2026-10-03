jest.mock('../lib/google-sheets', () => ({
  registrarWebhookSeNovo: jest.fn(),
  finalizarWebhook: jest.fn(),
  atualizarPedidoPagamento: jest.fn(),
  marcarPedidoDivergente: jest.fn(),
  buscarPedidoByPreferenceOrPayment: jest.fn(),
  registrarEntrega: jest.fn(),
  contarDownloadsPedido: jest.fn(),
}));
jest.mock('../lib/stripe-gateway', () => ({
  construirEvento: jest.fn(),
  tarifaReal: jest.fn(),
  centavos: (v) => Math.round(Number(v) * 100),
}));
jest.mock('../lib/delivery', () => ({
  criarDownloadsDoPedido: jest.fn(),
  enviarEmailEntrega: jest.fn(),
  criarMensagemWhatsApp: jest.fn(() => 'Links seguros'),
}));

const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');
const handler = require('../api/webhook/stripe');
const sheets = require('../lib/google-sheets');
const gw = require('../lib/stripe-gateway');
const delivery = require('../lib/delivery');

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.post('/api/webhook/stripe', handler);
app.use(errorHandler);

const sessao = (extra = {}) => ({
  id: 'cs_test_1', client_reference_id: 'PED_1', payment_intent: 'pi_1', payment_status: 'paid', amount_total: 1250, currency: 'brl', ...extra,
});
const evento = (tipo = 'checkout.session.completed', objeto = sessao(), id = 'evt_1') => ({ id, type: tipo, data: { object: objeto } });
const pedidoArmazenado = (extra = {}) => ({ id: 'PED_1', total: 12.5, status: 'Pagamento Pendente', row: { get: (k) => (k === 'PreferenceID' ? 'cs_test_1' : '') }, ...extra });

function post(corpo = { qualquer: 'coisa' }) {
  return request(app).post('/api/webhook/stripe').set('stripe-signature', 't=1,v1=ok').send(corpo);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  gw.construirEvento.mockReturnValue(evento());
  gw.tarifaReal.mockResolvedValue(1.39);
  sheets.registrarWebhookSeNovo.mockResolvedValue(true);
  sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue(pedidoArmazenado());
  sheets.atualizarPedidoPagamento.mockResolvedValue({ id: 'PED_1', email: 'maria@example.com', whatsapp: '99982061089' });
  sheets.contarDownloadsPedido.mockResolvedValue(0);
  delivery.criarDownloadsDoPedido.mockResolvedValue([{ url: 'https://safe.test/download' }]);
  delivery.enviarEmailEntrega.mockResolvedValue({ status: 'enviado', error: '', attemptedAt: '2026-10-03T12:00:00.000Z' });
});

describe('assinatura', () => {
  it('assinatura inválida: 401, nada é lido nem gravado', async () => {
    gw.construirEvento.mockImplementation(() => { throw new Error('No signatures found'); });
    const res = await post();
    expect(res.status).toBe(401);
    expect(sheets.registrarWebhookSeNovo).not.toHaveBeenCalled();
    expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
    expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  });

  it('envia ao verificador o corpo cru e o cabeçalho Stripe-Signature', async () => {
    await post({ a: 1 });
    expect(gw.construirEvento).toHaveBeenCalledWith('{"a":1}', 't=1,v1=ok');
  });

  it('sem segredo configurado, o servidor recusa (500) sem processar', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect((await post()).status).toBe(500);
    expect(gw.construirEvento).not.toHaveBeenCalled();
  });

  it('só aceita POST', async () => {
    expect((await request(app).get('/api/webhook/stripe')).status).toBe(404);
  });
});

describe('pagamento confirmado', () => {
  it('confere valor e moeda, marca como pago, grava a tarifa real e libera a entrega', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(sheets.atualizarPedidoPagamento).toHaveBeenCalledWith('PED_1', { id: 'pi_1', status: 'approved', fee_details: [{ amount: 1.39 }] });
    expect(delivery.criarDownloadsDoPedido).toHaveBeenCalledTimes(1);
    expect(sheets.registrarEntrega).toHaveBeenCalledWith('PED_1', expect.objectContaining({
      emailResult: expect.objectContaining({ status: 'enviado' }),
      whatsappLink: expect.stringContaining('https://wa.me/5599982061089'),
    }));
    expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'Processado');
  });

  it('Pix pago depois (async_payment_succeeded) também entrega', async () => {
    gw.construirEvento.mockReturnValue(evento('checkout.session.async_payment_succeeded'));
    expect((await post()).status).toBe(200);
    expect(delivery.criarDownloadsDoPedido).toHaveBeenCalled();
  });

  it('se a tarifa real não puder ser lida, vende mesmo assim', async () => {
    gw.tarifaReal.mockResolvedValue('');
    await post();
    expect(sheets.atualizarPedidoPagamento.mock.calls[0][1].fee_details).toBeUndefined();
    expect(delivery.criarDownloadsDoPedido).toHaveBeenCalled();
  });

  it('SMTP falhando não impede a entrega pelo WhatsApp nem o fechamento do webhook', async () => {
    delivery.enviarEmailEntrega.mockResolvedValue({ status: 'falhou', error: 'smtp', attemptedAt: 'x' });
    expect((await post()).status).toBe(200);
    expect(sheets.registrarEntrega.mock.calls[0][1].whatsappLink).toContain('wa.me');
  });
});

describe('Pix aguardando', () => {
  it('completed com payment_status "unpaid" não confirma nem entrega', async () => {
    gw.construirEvento.mockReturnValue(evento('checkout.session.completed', sessao({ payment_status: 'unpaid' })));
    const res = await post();
    expect(res.body).toMatchObject({ ok: true, pending: true });
    expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
    expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  });
});

describe('divergência e fraude', () => {
  it.each([
    ['valor menor (pagou R$ 0,01)', sessao({ amount_total: 1 })],
    ['valor maior', sessao({ amount_total: 99999 })],
    ['moeda diferente', sessao({ currency: 'usd' })],
  ])('%s: marca divergente, não entrega', async (_nome, obj) => {
    gw.construirEvento.mockReturnValue(evento('checkout.session.completed', obj));
    const res = await post();
    expect(res.status).toBe(202);
    expect(res.body.divergent).toBe(true);
    expect(sheets.marcarPedidoDivergente).toHaveBeenCalledWith('PED_1', expect.stringMatching(/divergente/i), { id: 'pi_1' });
    expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
    expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
    expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'PagamentoDivergente');
  });

  it('sessão que não pertence ao pedido (PreferenceID diferente) é ignorada', async () => {
    sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue(pedidoArmazenado({ row: { get: () => 'cs_de_outro_pedido' } }));
    const res = await post();
    expect(res.status).toBe(202);
    expect(res.body.unmatched).toBe(true);
    expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  });

  it('pedido inexistente ou sem referência é ignorado', async () => {
    sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue(null);
    expect((await post()).body.unmatched).toBe(true);
    gw.construirEvento.mockReturnValue(evento('checkout.session.completed', sessao({ client_reference_id: undefined })));
    expect((await post()).body.unmatched).toBe(true);
    expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
  });
});

describe('repetição e idempotência', () => {
  it('evento já processado (mesmo id): não faz nada de novo', async () => {
    sheets.registrarWebhookSeNovo.mockResolvedValue(false);
    const res = await post();
    expect(res.body.duplicate).toBe(true);
    expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
    expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  });

  it('outro evento do mesmo pagamento (pedido já confirmado e com downloads): não entrega duas vezes', async () => {
    sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue(pedidoArmazenado({ status: 'Pagamento Confirmado' }));
    sheets.contarDownloadsPedido.mockResolvedValue(3);
    const res = await post();
    expect(res.body.jaConfirmado).toBe(true);
    expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
    expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
  });

  it('pedido confirmado mas sem downloads (a entrega falhou antes): a nova tentativa da Stripe completa a entrega', async () => {
    sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue(pedidoArmazenado({ status: 'Pagamento Confirmado' }));
    sheets.contarDownloadsPedido.mockResolvedValue(0);
    expect((await post()).status).toBe(200);
    expect(delivery.criarDownloadsDoPedido).toHaveBeenCalledTimes(1);
  });

  it('falha na entrega devolve erro (a Stripe tenta de novo) e o webhook não é dado como processado', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    delivery.criarDownloadsDoPedido.mockRejectedValue(new Error('Drive fora do ar'));
    const res = await post();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/Drive/);
    expect(sheets.finalizarWebhook).not.toHaveBeenCalled();
  });
});

describe('falha e expiração', () => {
  it('Pix que falhou marca o pedido como recusado, sem entrega', async () => {
    gw.construirEvento.mockReturnValue(evento('checkout.session.async_payment_failed'));
    await post();
    expect(sheets.atualizarPedidoPagamento).toHaveBeenCalledWith('PED_1', { id: 'pi_1', status: 'rejected' });
    expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  });

  it('sessão expirada cancela o pedido pendente', async () => {
    gw.construirEvento.mockReturnValue(evento('checkout.session.expired', sessao({ payment_intent: null, payment_status: 'unpaid' })));
    await post();
    expect(sheets.atualizarPedidoPagamento).toHaveBeenCalledWith('PED_1', { id: 'cs_test_1', status: 'cancelled' });
  });

  it('expiração ou falha atrasada nunca rebaixa um pedido já confirmado', async () => {
    sheets.buscarPedidoByPreferenceOrPayment.mockResolvedValue(pedidoArmazenado({ status: 'Pagamento Confirmado' }));
    gw.construirEvento.mockReturnValue(evento('checkout.session.expired'));
    await post();
    expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
  });

  it('tipos de evento que não interessam são ignorados', async () => {
    gw.construirEvento.mockReturnValue(evento('charge.refunded'));
    const res = await post();
    expect(res.body.ignored).toBe(true);
    expect(sheets.registrarWebhookSeNovo).not.toHaveBeenCalled();
  });
});
