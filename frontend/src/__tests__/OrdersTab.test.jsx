import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import OrdersTab from '../shared/pascom/OrdersTab.jsx';
import * as api from '../lib/api.js';

jest.mock('../lib/api.js', () => ({
  pascomDashboard: jest.fn(),
  pascomPedidos: jest.fn(),
  pascomPedidoDetalhe: jest.fn(),
  pascomRegenerarDownloads: jest.fn(),
  pascomReenviarEntrega: jest.fn(),
  pascomConferirMercadoPago: jest.fn(),
}));

const getToken = jest.fn().mockResolvedValue('clerk-token');

const atencao = [
  {
    tipo: 'pago_sem_entrega', severidade: 'erro', motivo: 'Pago, mas sem nenhum link de download gerado',
    detalhe: '', pedidoId: 'PED_1', email: 'maria@example.com', total: 12, status: 'Pagamento Confirmado',
  },
  {
    tipo: 'pendente_sem_confirmacao', severidade: 'aviso', motivo: 'Pendente ha mais de uma hora',
    detalhe: 'A conferencia com o Mercado Pago roda a cada 5 minutos.', pedidoId: 'PED_2', email: 'joao@example.com', total: 24,
    status: 'Pagamento Pendente',
  },
];

function dashboard(overrides = {}) {
  return {
    ordersToday: 2, revenueToday: 36, ordersMonth: 5, revenueMonth: 120, pendingOrders: 1,
    activeDownloads: 3, publishedEvents: 4, deliveryIssues: 1, atencao,
    resumoAtencao: { erros: 1, avisos: 1 },
    ...overrides,
  };
}

function detalhe(overrides = {}) {
  return {
    pedido: {
      id: 'PED_1', status: 'Pagamento Confirmado', name: 'Maria', email: 'maria@example.com', whatsapp: '99982061089',
      total: 12, paymentMethod: 'pix', paymentId: 'PAY_9', discountTotal: 0, couponCode: '', packageId: '',
      createdAt: '2026-09-19T10:00:00.000Z', paidAt: '2026-09-19T11:00:00.000Z',
      emailStatus: 'falhou', emailError: 'Gmail bloqueou o login', emailSentAt: '',
      emailAttemptedAt: '2026-09-19T11:01:00.000Z', deliveryAttempts: 2,
      whatsappLink: 'https://wa.me/5599982061089?text=links',
      ...(overrides.pedido || {}),
    },
    itens: [{ fotoId: 'F1', eventoId: 'EV1', eventTitle: 'Casamento' }],
    downloads: [
      { downloadId: 'DL_1', fotoId: 'F1', uses: 0, maxUses: 5, expiresAt: '2036-09-26T12:00:00.000Z' },
      { downloadId: 'DL_2', fotoId: 'F2', uses: 2, maxUses: 5, expiresAt: '2020-01-01T12:00:00.000Z' },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  api.pascomDashboard.mockResolvedValue({ dashboard: dashboard() });
  api.pascomPedidos.mockResolvedValue({
    pedidos: [
      { id: 'PED_1', status: 'Pagamento Confirmado', email: 'maria@example.com', total: 12 },
      { id: 'PED_2', status: 'Pagamento Pendente', email: 'joao@example.com', total: 24 },
    ],
  });
  api.pascomPedidoDetalhe.mockResolvedValue(detalhe());
  api.pascomReenviarEntrega.mockResolvedValue({
    emailStatus: 'enviado', emailError: '', downloads: [{ fotoId: 'F1', url: 'u', expiresAt: 'x' }],
    whatsappLink: 'https://wa.me/55', whatsappMessage: 'links',
  });
  api.pascomConferirMercadoPago.mockResolvedValue({ situacao: 'aguardando', statusMp: 'pending' });
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => jest.restoreAllMocks());

async function montar() {
  render(<OrdersTab getToken={getToken} />);
  await waitFor(() => expect(screen.getAllByText('PED_1').length).toBeGreaterThan(0));
}

it('mostra os pedidos que precisam de atencao com o motivo em texto', async () => {
  await montar();

  const bloco = screen.getByLabelText('Precisam de atenção');
  expect(within(bloco).getByText(/Pago, mas sem nenhum link/)).toBeInTheDocument();
  expect(within(bloco).getByText(/Pendente ha mais de uma hora/)).toBeInTheDocument();
  expect(within(bloco).getByText(/maria@example.com/)).toBeInTheDocument();
  expect(within(bloco).getByText(/A conferencia com o Mercado Pago/)).toBeInTheDocument();

  expect(screen.getByText('Entregas com problema')).toBeInTheDocument();
  expect(screen.getByText('Pedidos pendentes')).toBeInTheDocument();
});

it('esconde o bloco de atencao quando nao ha nada para resolver', async () => {
  api.pascomDashboard.mockResolvedValue({ dashboard: dashboard({ atencao: [], deliveryIssues: 0 }) });
  await montar();
  expect(screen.queryByLabelText('Precisam de atenção')).not.toBeInTheDocument();
});

it('clicar num item de atencao abre o pedido', async () => {
  await montar();
  api.pascomPedidoDetalhe.mockClear();

  fireEvent.click(screen.getByText(/Pendente ha mais de uma hora/));

  await waitFor(() => expect(api.pascomPedidoDetalhe).toHaveBeenCalledWith('clerk-token', 'PED_2'));
});

it('mostra o estado da entrega, o erro do e-mail e a validade de cada link', async () => {
  await montar();

  await waitFor(() => expect(screen.getByText(/E-mail falhou/)).toBeInTheDocument());
  expect(screen.getByText('Gmail bloqueou o login')).toBeInTheDocument();
  expect(screen.getByText(/2 tentativa\(s\)/)).toBeInTheDocument();
  expect(screen.getByText('PAY_9')).toBeInTheDocument();
  expect(screen.getByText(/vale até/)).toBeInTheDocument();
  expect(screen.getByText(/expirou em/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/5599982061089?text=links');
});

it('reenvia a entrega depois de confirmar e conta o que aconteceu', async () => {
  await montar();

  fireEvent.click(await screen.findByRole('button', { name: 'Reenviar entrega' }));

  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('deixam de funcionar'));
  await waitFor(() => expect(api.pascomReenviarEntrega).toHaveBeenCalledWith('clerk-token', 'PED_1'));
  expect(await screen.findByText(/Entrega reenviada/)).toBeInTheDocument();
});

it('nao reenvia quando a pessoa cancela a confirmacao', async () => {
  window.confirm.mockReturnValue(false);
  await montar();

  fireEvent.click(await screen.findByRole('button', { name: 'Reenviar entrega' }));

  expect(api.pascomReenviarEntrega).not.toHaveBeenCalled();
});

it('avisa quando o reenvio gera os links mas o e-mail nao sai', async () => {
  api.pascomReenviarEntrega.mockResolvedValue({
    emailStatus: 'falhou', emailError: 'Gmail bloqueou', downloads: [], whatsappLink: 'https://wa.me/55',
  });
  await montar();

  fireEvent.click(await screen.findByRole('button', { name: 'Reenviar entrega' }));

  expect(await screen.findByText(/Gmail bloqueou/)).toBeInTheDocument();
  expect(screen.getByText(/WhatsApp/)).toBeInTheDocument();
});

it('confere o pagamento no Mercado Pago sem exigir pedido aprovado', async () => {
  api.pascomPedidoDetalhe.mockResolvedValue(detalhe({ pedido: { status: 'Pagamento Pendente' } }));
  await montar();

  const reenviar = await screen.findByRole('button', { name: 'Reenviar entrega' });
  expect(reenviar).toBeDisabled();

  const conferir = screen.getByRole('button', { name: 'Conferir no Mercado Pago' });
  expect(conferir).toBeEnabled();
  fireEvent.click(conferir);

  await waitFor(() => expect(api.pascomConferirMercadoPago).toHaveBeenCalledWith('clerk-token', 'PED_1'));
  expect(await screen.findByText(/ainda não aprovou/)).toBeInTheDocument();
});

it('conta quando a conferencia entrega o pedido na hora', async () => {
  api.pascomConferirMercadoPago.mockResolvedValue({ situacao: 'entregue', paymentId: 'PAY_9', emailStatus: 'enviado' });
  await montar();

  fireEvent.click(await screen.findByRole('button', { name: 'Conferir no Mercado Pago' }));

  expect(await screen.findByText(/fotos entregues agora/)).toBeInTheDocument();
});

it('filtra somente os pedidos que precisam de atencao', async () => {
  await montar();

  fireEvent.click(screen.getByLabelText(/Só os que precisam de atenção/));

  await waitFor(() => expect(api.pascomPedidos).toHaveBeenLastCalledWith('clerk-token', expect.objectContaining({ atencao: 'true' })));
});

it('mostra o erro do servidor sem derrubar a aba', async () => {
  api.pascomReenviarEntrega.mockRejectedValue(new Error('So e possivel reenviar a entrega de pedidos aprovados.'));
  await montar();

  fireEvent.click(await screen.findByRole('button', { name: 'Reenviar entrega' }));

  expect(await screen.findByText('So e possivel reenviar a entrega de pedidos aprovados.')).toBeInTheDocument();
  expect(screen.getAllByText('PED_1').length).toBeGreaterThan(0);
});
