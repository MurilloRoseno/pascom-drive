jest.mock('../lib/google-sheets', () => ({
  registrarWebhookSeNovo: jest.fn(),
  finalizarWebhook: jest.fn(),
  buscarDoacaoById: jest.fn(),
  atualizarDoacao: jest.fn(),
  registrarDoacao: jest.fn(),
}));
jest.mock('../lib/delivery', () => ({ enviarEmail: jest.fn() }));

const sheets = require('../lib/google-sheets');
const delivery = require('../lib/delivery');
const { eventoDeDoacao, processarEventoDoacao } = require('../lib/donation-webhook');

const DOACAO = {
  id: 'DOA_1', status: 'Pendente', destino: 'dizimo', frequency: 'unica', method: 'pix',
  amount: 50, fee: 0.6, total: 50.6, name: 'Maria Silva', email: 'maria@example.com',
};

function sessionEvent(type = 'checkout.session.completed', overrides = {}) {
  return {
    id: 'evt_1',
    type,
    data: {
      object: {
        id: 'cs_test_1',
        payment_intent: 'pi_1',
        client_reference_id: 'DOA_1',
        payment_status: 'paid',
        amount_total: 5060,
        currency: 'brl',
        customer: 'cus_1',
        customer_details: { email: 'stripe@example.com' },
        metadata: { tipo: 'doacao', doacao_id: 'DOA_1', destino: 'dizimo' },
        ...overrides,
      },
    },
  };
}

function invoiceEvent(overrides = {}) {
  return {
    id: 'evt_inv_1',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_1',
        billing_reason: 'subscription_cycle',
        amount_paid: 5246,
        currency: 'brl',
        customer: 'cus_1',
        customer_email: 'maria@example.com',
        parent: { subscription_details: { subscription: 'sub_1', metadata: { tipo: 'doacao', destino: 'obras', valor: '50', taxa: '2.46' } } },
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DOWNLOAD_JWT_SECRET = 'segredo-de-teste';
  process.env.PUBLIC_APP_URL = 'https://pascom-drive.test';
  sheets.registrarWebhookSeNovo.mockResolvedValue(true);
  sheets.buscarDoacaoById.mockResolvedValue({ ...DOACAO });
  delivery.enviarEmail.mockResolvedValue({ status: 'enviado', error: '', attemptedAt: 'agora' });
});

describe('eventoDeDoacao', () => {
  it('reconhece sessoes e faturas marcadas como doacao', () => {
    expect(eventoDeDoacao(sessionEvent())).toBe(true);
    expect(eventoDeDoacao(invoiceEvent())).toBe(true);
  });

  it('deixa passar eventos do fluxo de fotos e eventos sem relacao', () => {
    expect(eventoDeDoacao(sessionEvent('checkout.session.completed', { metadata: { pedido_id: 'PED_1' } }))).toBe(false);
    expect(eventoDeDoacao(invoiceEvent({ parent: { subscription_details: { subscription: 'sub_9', metadata: {} } } }))).toBe(false);
    expect(eventoDeDoacao({ id: 'evt_2', type: 'charge.updated', data: { object: {} } })).toBe(false);
  });

  it('entende o formato antigo da fatura', () => {
    expect(eventoDeDoacao(invoiceEvent({ parent: undefined, subscription: 'sub_1', subscription_details: { metadata: { tipo: 'doacao' } } }))).toBe(true);
  });
});

describe('doacao unica', () => {
  it('confirma, grava e envia o comprovante ao e-mail informado no formulario', async () => {
    const outcome = await processarEventoDoacao(sessionEvent());
    expect(outcome).toEqual({ status: 200, body: { ok: true } });
    expect(delivery.enviarEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'maria@example.com',
      subject: 'Recebemos sua oferta — Paróquia São Rafael',
      html: expect.stringContaining('Dízimo'),
    }));
    expect(sheets.atualizarDoacao).toHaveBeenCalledWith('DOA_1', expect.objectContaining({
      Status: 'Confirmada', PaymentID: 'pi_1', AssinaturaID: '', ClienteID: 'cus_1', EmailStatus: 'enviado',
    }));
    expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'Processado');
  });

  it('usa o e-mail do Stripe quando o doador nao informou no formulario', async () => {
    sheets.buscarDoacaoById.mockResolvedValue({ ...DOACAO, name: '', email: '' });
    await processarEventoDoacao(sessionEvent());
    expect(delivery.enviarEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'stripe@example.com' }));
  });

  it('ignora evento duplicado', async () => {
    sheets.registrarWebhookSeNovo.mockResolvedValue(false);
    const outcome = await processarEventoDoacao(sessionEvent());
    expect(outcome.body).toEqual({ ok: true, duplicate: true });
    expect(sheets.atualizarDoacao).not.toHaveBeenCalled();
  });

  it('marca divergencia quando o valor pago difere do registrado', async () => {
    const outcome = await processarEventoDoacao(sessionEvent('checkout.session.completed', { amount_total: 500 }));
    expect(outcome.status).toBe(202);
    expect(sheets.atualizarDoacao).toHaveBeenCalledWith('DOA_1', { Status: 'Divergente', PaymentID: 'pi_1' });
    expect(delivery.enviarEmail).not.toHaveBeenCalled();
    expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'DoacaoDivergente');
  });

  it('espera o Pix: sessao concluida sem pagamento nao confirma nem envia e-mail', async () => {
    await processarEventoDoacao(sessionEvent('checkout.session.completed', { payment_status: 'unpaid' }));
    expect(sheets.atualizarDoacao).not.toHaveBeenCalled();
    expect(delivery.enviarEmail).not.toHaveBeenCalled();
  });

  it('confirma quando o pagamento assincrono chega', async () => {
    await processarEventoDoacao(sessionEvent('checkout.session.async_payment_succeeded'));
    expect(sheets.atualizarDoacao).toHaveBeenCalledWith('DOA_1', expect.objectContaining({ Status: 'Confirmada' }));
  });

  it('nao envia segundo comprovante para doacao ja confirmada', async () => {
    sheets.buscarDoacaoById.mockResolvedValue({ ...DOACAO, status: 'Confirmada' });
    await processarEventoDoacao(sessionEvent('checkout.session.async_payment_succeeded'));
    expect(delivery.enviarEmail).not.toHaveBeenCalled();
    expect(sheets.atualizarDoacao).not.toHaveBeenCalled();
  });

  it('marca como expirada sem rebaixar doacao confirmada', async () => {
    await processarEventoDoacao(sessionEvent('checkout.session.expired', { payment_status: 'unpaid' }));
    expect(sheets.atualizarDoacao).toHaveBeenCalledWith('DOA_1', { Status: 'Expirada' });
    sheets.atualizarDoacao.mockClear();
    sheets.buscarDoacaoById.mockResolvedValue({ ...DOACAO, status: 'Confirmada' });
    await processarEventoDoacao({ ...sessionEvent('checkout.session.expired'), id: 'evt_2' });
    expect(sheets.atualizarDoacao).not.toHaveBeenCalled();
  });

  it('registra doacao nao encontrada', async () => {
    sheets.buscarDoacaoById.mockResolvedValue(null);
    const outcome = await processarEventoDoacao(sessionEvent());
    expect(outcome.status).toBe(202);
    expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_1', 'DoacaoNaoEncontrada');
  });
});

describe('doacao mensal', () => {
  it('guarda a assinatura e envia o link de gerenciamento na primeira cobranca', async () => {
    sheets.buscarDoacaoById.mockResolvedValue({ ...DOACAO, frequency: 'mensal', method: 'credit_card' });
    await processarEventoDoacao(sessionEvent('checkout.session.completed', { payment_intent: null, invoice: 'in_0', subscription: 'sub_1' }));
    expect(sheets.atualizarDoacao).toHaveBeenCalledWith('DOA_1', expect.objectContaining({ PaymentID: 'in_0', AssinaturaID: 'sub_1' }));
    const mail = delivery.enviarEmail.mock.calls[0][0];
    expect(mail.subject).toBe('Recebemos sua oferta mensal — Paróquia São Rafael');
    expect(mail.html).toContain('https://pascom-drive.test/doar/gerenciar?token=');
  });

  it('registra cada cobranca seguinte como nova linha, sem nome nem e-mail', async () => {
    const outcome = await processarEventoDoacao(invoiceEvent());
    expect(outcome.status).toBe(200);
    expect(sheets.registrarDoacao).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringMatching(/^DOA_/), paymentId: 'in_1', subscriptionId: 'sub_1', customerId: 'cus_1',
      status: 'Confirmada', destino: 'obras', frequency: 'mensal', amount: 50, fee: 2.46, total: 52.46, emailStatus: 'enviado',
    }));
    expect(sheets.registrarDoacao.mock.calls[0][0]).not.toHaveProperty('email');
    expect(delivery.enviarEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'maria@example.com' }));
    expect(sheets.finalizarWebhook).toHaveBeenCalledWith('evt_inv_1', 'Processado');
  });

  it('ignora a fatura da primeira cobranca, ja tratada pela sessao', async () => {
    const outcome = await processarEventoDoacao(invoiceEvent({ billing_reason: 'subscription_create' }));
    expect(outcome.body).toEqual({ ok: true, ignored: true });
    expect(sheets.registrarDoacao).not.toHaveBeenCalled();
  });

  it('usa o valor pago quando ele nao bate com os metadados da assinatura', async () => {
    await processarEventoDoacao(invoiceEvent({ amount_paid: 8000 }));
    expect(sheets.registrarDoacao).toHaveBeenCalledWith(expect.objectContaining({ amount: 80, fee: 0, total: 80 }));
  });
});
