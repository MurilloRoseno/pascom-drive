jest.mock('../lib/google-sheets', () => ({
  rows: jest.fn(),
  atualizarPedidoPagamento: jest.fn(),
  marcarPedidoDivergente: jest.fn(),
  registrarEntrega: jest.fn(),
  auditarConsistenciaComercial: jest.fn(),
}));
jest.mock('../lib/delivery', () => ({
  criarDownloadsDoPedido: jest.fn(),
  enviarEmailEntrega: jest.fn(),
  criarLinkWhatsApp: jest.fn(() => 'https://wa.me/5599982061089?text=links'),
}));
jest.mock('../lib/mercado-pago', () => ({
  consultarPagamento: jest.fn(),
  buscarPagamentosDoPedido: jest.fn(),
  listarPagamentosRecentes: jest.fn(),
}));

const sheets = require('../lib/google-sheets');
const delivery = require('../lib/delivery');
const mp = require('../lib/mercado-pago');
const {
  conciliarEntregas, conciliarPedido, entregarPedidoPago, conferirValor,
} = require('../lib/order-fulfillment');
const { classificarEntrega, proximaTentativaEm } = require('../lib/delivery-health');

const AGORA = Date.parse('2026-09-19T12:00:00Z');
const UMA_HORA = 60 * 60 * 1000;

function row(data) {
  return { get: (key) => data[key] };
}

function pedidoRow(overrides = {}) {
  return row({
    PedidoID: 'PED_1',
    Status: 'Pagamento Confirmado',
    Nome: 'Maria',
    Email: 'maria@example.com',
    WhatsApp: '99982061089',
    Total: 12,
    DataCriacao: new Date(AGORA - 2 * UMA_HORA).toISOString(),
    DataPagamento: new Date(AGORA - UMA_HORA).toISOString(),
    ...overrides,
  });
}

function comDownloads(...pedidoIds) {
  return pedidoIds.map((id) => row({ PedidoID: id }));
}

function prepararPlanilha(pedidos, downloads = []) {
  sheets.rows.mockImplementation(async (aba) => {
    if (aba === 'Pedidos') return pedidos;
    if (aba === 'Downloads') return downloads;
    return [];
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  delivery.criarDownloadsDoPedido.mockResolvedValue([{ fotoId: 'F1', url: 'https://safe.test/dl', expiresAt: '2026-09-26T12:00:00.000Z' }]);
  delivery.enviarEmailEntrega.mockResolvedValue({ status: 'enviado', error: '', attemptedAt: '2026-09-19T12:00:00.000Z' });
  sheets.atualizarPedidoPagamento.mockImplementation(async (id) => ({ id, email: 'maria@example.com', whatsapp: '99982061089', total: 12 }));
  sheets.auditarConsistenciaComercial.mockResolvedValue([]);
  mp.buscarPagamentosDoPedido.mockResolvedValue([]);
  mp.listarPagamentosRecentes.mockResolvedValue([]);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Regras puras ────────────────────────────────────────────────────────────

it('classifica o que falta em cada pedido', () => {
  const base = { id: 'PED_1', status: 'Pagamento Confirmado', paidAt: new Date(AGORA - UMA_HORA).toISOString() };

  expect(classificarEntrega(base, { agora: AGORA, temDownload: false })).toEqual({
    tarefa: 'entregar',
    problema: expect.objectContaining({ tipo: 'pago_sem_entrega', severidade: 'erro' }),
  });

  expect(classificarEntrega({ ...base, emailStatus: 'enviado' }, { agora: AGORA, temDownload: true }))
    .toEqual({ tarefa: '', problema: null });

  expect(classificarEntrega({ ...base, emailStatus: 'falhou', deliveryAttempts: 1 }, { agora: AGORA, temDownload: true }))
    .toEqual({ tarefa: 'reenviar', problema: expect.objectContaining({ tipo: 'email_pendente', severidade: 'aviso' }) });

  expect(classificarEntrega({
    ...base, emailStatus: 'falhou', deliveryAttempts: 1, deliveryNextAt: new Date(AGORA + UMA_HORA).toISOString(),
  }, { agora: AGORA, temDownload: true })).toEqual({ tarefa: '', problema: expect.objectContaining({ tipo: 'email_pendente' }) });

  expect(classificarEntrega({ ...base, emailStatus: 'falhou', deliveryAttempts: 3 }, { agora: AGORA, temDownload: true }))
    .toEqual({ tarefa: '', problema: expect.objectContaining({ tipo: 'email_falhou', severidade: 'erro' }) });

  // SMTP ausente nao e uma falha para tentar de novo: a entrega foi pelo WhatsApp.
  expect(classificarEntrega({ ...base, emailStatus: 'nao_configurado' }, { agora: AGORA, temDownload: true }))
    .toEqual({ tarefa: '', problema: expect.objectContaining({ tipo: 'email_nao_configurado', severidade: 'aviso' }) });

  // Pedido antigo nao tem reenvio automatico: o link atual pode estar com o comprador.
  expect(classificarEntrega({
    ...base, emailStatus: 'falhou', paidAt: new Date(AGORA - 30 * 24 * UMA_HORA).toISOString(),
  }, { agora: AGORA, temDownload: true }).tarefa).toBe('');

  expect(classificarEntrega({ status: 'PagamentoDivergente' }, { agora: AGORA, temDownload: true }))
    .toEqual({ tarefa: '', problema: expect.objectContaining({ tipo: 'pagamento_divergente', severidade: 'erro' }) });
});

it('confere pendentes so depois de 10 minutos e ate 72 horas', () => {
  const pendente = (minutos) => ({ status: 'Pagamento Pendente', createdAt: new Date(AGORA - minutos * 60 * 1000).toISOString() });
  expect(classificarEntrega(pendente(5), { agora: AGORA }).tarefa).toBe('');
  expect(classificarEntrega(pendente(30), { agora: AGORA }).tarefa).toBe('conciliar');
  expect(classificarEntrega(pendente(30), { agora: AGORA }).problema).toBeNull();
  expect(classificarEntrega(pendente(120), { agora: AGORA }).problema)
    .toEqual(expect.objectContaining({ tipo: 'pendente_sem_confirmacao', severidade: 'aviso' }));
  expect(classificarEntrega(pendente(80 * 60), { agora: AGORA }).tarefa).toBe('');
});

it('espera 5, 20 e 60 minutos e desiste na terceira tentativa', () => {
  expect(Date.parse(proximaTentativaEm(1, AGORA)) - AGORA).toBe(5 * 60 * 1000);
  expect(Date.parse(proximaTentativaEm(2, AGORA)) - AGORA).toBe(20 * 60 * 1000);
  expect(proximaTentativaEm(3, AGORA)).toBe('');
});

it('recusa valor e moeda diferentes do pedido', () => {
  expect(conferirValor({ transaction_amount: 12, currency_id: 'BRL' }, { total: 12 }).ok).toBe(true);
  expect(conferirValor({ transaction_amount: 12.005, currency_id: 'BRL' }, { total: 12 }).ok).toBe(true);
  expect(conferirValor({ transaction_amount: 1, currency_id: 'BRL' }, { total: 12 }).ok).toBe(false);
  expect(conferirValor({ transaction_amount: 12, currency_id: 'USD' }, { total: 12 }).ok).toBe(false);
});

// ─── Entrega ─────────────────────────────────────────────────────────────────

it('entregar duas vezes nao duplica nada e zera o contador quando o e-mail sai', async () => {
  const pedido = { id: 'PED_1', email: 'maria@example.com', whatsapp: '99982061089', deliveryAttempts: 2 };

  await entregarPedidoPago(pedido);
  await entregarPedidoPago(pedido);

  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalledTimes(2);
  expect(sheets.registrarEntrega).toHaveBeenNthCalledWith(1, 'PED_1', expect.objectContaining({
    emailResult: expect.objectContaining({ status: 'enviado' }),
    whatsappLink: expect.stringContaining('wa.me'),
    tentativas: 0,
    proximaEm: '',
  }));
});

it('conta a tentativa e agenda a proxima quando o e-mail falha', async () => {
  delivery.enviarEmailEntrega.mockResolvedValue({ status: 'falhou', error: 'Gmail bloqueou', attemptedAt: 'x' });

  const primeira = await entregarPedidoPago({ id: 'PED_1', deliveryAttempts: 0 });
  expect(primeira.entregue).toBe(false);
  expect(sheets.registrarEntrega).toHaveBeenLastCalledWith('PED_1', expect.objectContaining({
    tentativas: 1,
    proximaEm: expect.any(String),
  }));

  await entregarPedidoPago({ id: 'PED_1', deliveryAttempts: 2 });
  expect(sheets.registrarEntrega).toHaveBeenLastCalledWith('PED_1', expect.objectContaining({
    tentativas: 3,
    proximaEm: '',
  }));
});

// ─── Conciliacao de um pedido ────────────────────────────────────────────────

it('pedido aprovado no Mercado Pago vira pago e e entregue na hora', async () => {
  mp.buscarPagamentosDoPedido.mockResolvedValue([{ id: 'PAY_9', status: 'approved' }]);
  mp.consultarPagamento.mockResolvedValue({ id: 'PAY_9', status: 'approved', transaction_amount: 12, currency_id: 'BRL' });

  const resultado = await conciliarPedido({ id: 'PED_1', total: 12, status: 'Pagamento Pendente' });

  expect(mp.buscarPagamentosDoPedido).toHaveBeenCalledWith('PED_1');
  expect(sheets.atualizarPedidoPagamento).toHaveBeenCalledWith('PED_1', expect.objectContaining({ id: 'PAY_9' }));
  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalled();
  expect(resultado).toEqual(expect.objectContaining({ situacao: 'entregue', paymentId: 'PAY_9' }));
});

it('pedido ainda pendente no Mercado Pago nao muda nada', async () => {
  mp.buscarPagamentosDoPedido.mockResolvedValue([{ id: 'PAY_9', status: 'pending' }]);

  const resultado = await conciliarPedido({ id: 'PED_1', total: 12 });

  expect(resultado).toEqual({ situacao: 'aguardando', statusMp: 'pending' });
  expect(mp.consultarPagamento).not.toHaveBeenCalled();
  expect(sheets.atualizarPedidoPagamento).not.toHaveBeenCalled();
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
});

it('valor divergente na conciliacao marca o pedido e nao entrega', async () => {
  mp.buscarPagamentosDoPedido.mockResolvedValue([{ id: 'PAY_9', status: 'approved' }]);
  mp.consultarPagamento.mockResolvedValue({ id: 'PAY_9', status: 'approved', transaction_amount: 1, currency_id: 'BRL' });

  const resultado = await conciliarPedido({ id: 'PED_1', total: 12 });

  expect(resultado.situacao).toBe('divergente');
  expect(sheets.marcarPedidoDivergente).toHaveBeenCalledWith('PED_1', 'Valor ou moeda divergente no Mercado Pago', expect.any(Object));
  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
});

// ─── Varredura do ciclo ──────────────────────────────────────────────────────

it('entrega o pedido pago que ficou sem link e reporta o problema', async () => {
  prepararPlanilha([pedidoRow()], []);

  const resultado = await conciliarEntregas({ agora: AGORA });

  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalledTimes(1);
  expect(resultado).toEqual(expect.objectContaining({ verificados: 1, entregues: 1, reenviados: 0, parcial: false }));
  expect(resultado.problemas).toEqual([expect.objectContaining({ tipo: 'pago_sem_entrega', pedidoId: 'PED_1' })]);
  expect(resultado.resumo).toEqual({ erros: 1, avisos: 0 });
});

it('confere o pendente antigo e reenvia o e-mail que falhou', async () => {
  mp.buscarPagamentosDoPedido.mockResolvedValue([{ id: 'PAY_9', status: 'approved' }]);
  mp.consultarPagamento.mockResolvedValue({ id: 'PAY_9', status: 'approved', transaction_amount: 12, currency_id: 'BRL' });
  prepararPlanilha([
    pedidoRow({ PedidoID: 'PED_PENDENTE', Status: 'Pagamento Pendente', DataPagamento: '' }),
    pedidoRow({ PedidoID: 'PED_EMAIL', EmailStatus: 'falhou', EmailErro: 'Gmail bloqueou', EntregaTentativas: 1 }),
  ], comDownloads('PED_EMAIL'));

  const resultado = await conciliarEntregas({ agora: AGORA });

  expect(resultado).toEqual(expect.objectContaining({ conciliados: 1, entregues: 1, reenviados: 1 }));
  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalledTimes(2);
});

it('nao reenvia depois de 3 tentativas e avisa que o e-mail nao foi entregue', async () => {
  prepararPlanilha([pedidoRow({ EmailStatus: 'falhou', EmailErro: 'Gmail bloqueou', EntregaTentativas: 3 })], comDownloads('PED_1'));

  const resultado = await conciliarEntregas({ agora: AGORA });

  expect(delivery.criarDownloadsDoPedido).not.toHaveBeenCalled();
  expect(resultado.reenviados).toBe(0);
  expect(resultado.problemas).toEqual([expect.objectContaining({
    tipo: 'email_falhou',
    severidade: 'erro',
    detalhe: 'Gmail bloqueou',
  })]);
});

it('uma falha nao interrompe os outros pedidos da fila', async () => {
  delivery.criarDownloadsDoPedido
    .mockRejectedValueOnce(new Error('Drive indisponivel'))
    .mockResolvedValue([{ fotoId: 'F1', url: 'https://safe.test/dl' }]);
  prepararPlanilha([
    pedidoRow({ PedidoID: 'PED_A', DataCriacao: new Date(AGORA - 3 * UMA_HORA).toISOString() }),
    pedidoRow({ PedidoID: 'PED_B' }),
  ], []);

  const resultado = await conciliarEntregas({ agora: AGORA });

  expect(resultado.entregues).toBe(1);
  expect(resultado.problemas).toEqual(expect.arrayContaining([
    expect.objectContaining({ tipo: 'falha_na_conciliacao', pedidoId: 'PED_A', detalhe: 'Drive indisponivel' }),
  ]));
});

it('para no orcamento e devolve parcial, deixando o resto para o proximo ciclo', async () => {
  const relogio = jest.spyOn(Date, 'now');
  let agora = AGORA;
  relogio.mockImplementation(() => agora);
  delivery.criarDownloadsDoPedido.mockImplementation(async () => {
    agora += 4000;
    return [{ fotoId: 'F1', url: 'https://safe.test/dl' }];
  });
  prepararPlanilha([
    pedidoRow({ PedidoID: 'PED_A' }),
    pedidoRow({ PedidoID: 'PED_B' }),
    pedidoRow({ PedidoID: 'PED_C' }),
  ], []);

  const resultado = await conciliarEntregas({ agora: AGORA, limiteMs: 5000 });

  expect(resultado.parcial).toBe(true);
  expect(resultado.entregues).toBeLessThan(3);
});

it('mais tarefas do que o teto do ciclo tambem fica parcial', async () => {
  const pedidos = [];
  for (let i = 0; i < 9; i += 1) pedidos.push(pedidoRow({ PedidoID: `PED_${i}` }));
  prepararPlanilha(pedidos, []);

  const resultado = await conciliarEntregas({ agora: AGORA });

  expect(resultado.parcial).toBe(true);
  expect(delivery.criarDownloadsDoPedido).toHaveBeenCalledTimes(8);
});

it('traz a auditoria comercial e nao repete o que a classificacao ja explicou', async () => {
  sheets.auditarConsistenciaComercial.mockResolvedValue([
    { severity: 'critical', type: 'download_without_purchased_item', pedidoId: 'PED_X', fotoId: 'F9' },
    { severity: 'medium', type: 'duplicated_webhook_key', webhookKey: 'REQ:PAY:payment' },
    { severity: 'high', type: 'paid_order_without_downloads', pedidoId: 'PED_1' },
  ]);
  prepararPlanilha([pedidoRow({ EmailStatus: 'enviado' })], comDownloads('PED_1'));

  const resultado = await conciliarEntregas({ agora: AGORA });

  expect(resultado.problemas.map((item) => item.tipo)).toEqual(['download_without_purchased_item', 'duplicated_webhook_key']);
  expect(resultado.resumo).toEqual({ erros: 1, avisos: 1 });
});

it('a varredura por data encontra pagamento aprovado sem pedido na planilha', async () => {
  mp.listarPagamentosRecentes.mockResolvedValue([
    { id: 'PAY_ORFAO', status: 'approved', external_reference: 'PED_FANTASMA', payer: { email: 'joao@example.com' } },
    { id: 'PAY_OK', status: 'approved', external_reference: 'PED_1' },
    { id: 'PAY_REJ', status: 'rejected', external_reference: 'PED_OUTRO' },
  ]);
  prepararPlanilha([pedidoRow({ EmailStatus: 'enviado' })], comDownloads('PED_1'));

  const resultado = await conciliarEntregas({ agora: AGORA, varredura: true });

  expect(mp.listarPagamentosRecentes).toHaveBeenCalledWith(expect.objectContaining({
    desde: new Date(AGORA - 72 * UMA_HORA).toISOString(),
    ate: new Date(AGORA).toISOString(),
  }));
  expect(resultado.problemas).toEqual([expect.objectContaining({
    tipo: 'pagamento_sem_pedido',
    severidade: 'erro',
    detalhe: expect.stringContaining('joao@example.com'),
  })]);
});

it('sem varredura pedida, nao gasta a busca por data no Mercado Pago', async () => {
  prepararPlanilha([pedidoRow({ EmailStatus: 'enviado' })], comDownloads('PED_1'));

  await conciliarEntregas({ agora: AGORA });

  expect(mp.listarPagamentosRecentes).not.toHaveBeenCalled();
});
