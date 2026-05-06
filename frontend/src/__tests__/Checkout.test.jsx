import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import CheckoutPage from '../pages/Checkout';

// Mock API
jest.mock('../lib/api', () => ({
  criarPagamento: jest.fn(),
}));

// Mock polling hook
jest.mock('../hooks/usePollingStatus', () => ({
  usePollingStatus: jest.fn(() => ({ status: null, isPolling: false, error: null })),
}));

const { criarPagamento } = require('../lib/api');
const { usePollingStatus } = require('../hooks/usePollingStatus');

const FOTO = { id: 'F1', event: 'Missa', url: 'http://x/1.jpg', price: 25 };

function renderCheckout(cartFotos = []) {
  return render(
    <MemoryRouter>
      <CarrinhoProvider initialFotos={cartFotos}>
        <CheckoutPage />
      </CarrinhoProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  criarPagamento.mockReset();
  usePollingStatus.mockReturnValue({ status: null, isPolling: false, error: null });
});

// ─── Step 0 ───────────────────────────────────────────────────────────────────

describe('Checkout step 0', () => {
  it('shows selected photos', () => {
    renderCheckout([FOTO]);
    expect(screen.getByText(/Missa/i)).toBeInTheDocument();
  });

  it('shows empty state when no photos', () => {
    renderCheckout([]);
    expect(screen.getByText(/nenhuma foto/i)).toBeInTheDocument();
  });

  it('Continuar button is disabled when cart is empty', () => {
    renderCheckout([]);
    const btn = screen.getByText(/continuar/i);
    expect(btn).toBeDisabled();
  });
});

// ─── Step 1 — WhatsApp ────────────────────────────────────────────────────────

describe('Checkout step 1', () => {
  it('advances to WhatsApp input on Continuar', () => {
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i));
    expect(screen.getByPlaceholderText(/DDD/i)).toBeInTheDocument();
  });

  it('shows validation error on invalid WhatsApp', () => {
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i)); // → step 1
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '123' } });
    fireEvent.click(screen.getByText(/continuar/i));
    expect(screen.getByText(/inválido/i)).toBeInTheDocument();
  });
});

// ─── Step 2 — Gerar QR Pix ───────────────────────────────────────────────────

describe('Checkout step 2', () => {
  function advanceToStep2() {
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i));            // → step 1
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByText(/continuar/i));            // → step 2
  }

  it('shows order summary on step 2', () => {
    advanceToStep2();
    expect(screen.getByText(/confirmar pedido/i)).toBeInTheDocument();
    expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
  });

  it('calls criarPagamento with correct data on Gerar QR Pix', async () => {
    criarPagamento.mockReturnValue(new Promise(() => {})); // never resolves
    advanceToStep2();
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    expect(criarPagamento).toHaveBeenCalledWith({
      whatsapp: '11999999999',
      fotoIds: ['F1'],
      total: expect.any(Number),
    });
  });

  it('shows loading text while creating payment', async () => {
    criarPagamento.mockReturnValue(new Promise(() => {}));
    advanceToStep2();
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    expect(screen.getByText(/gerando/i)).toBeInTheDocument();
  });

  it('shows QR code after successful payment creation', async () => {
    criarPagamento.mockResolvedValueOnce({
      id: 'MP_001',
      qrCode: 'pix-code-string',
      qrCodeBase64: 'base64data',
    });
    advanceToStep2();
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    await waitFor(() => expect(screen.getByText(/pix-code-string/i)).toBeInTheDocument());
  });

  it('shows error when payment creation fails', async () => {
    criarPagamento.mockRejectedValueOnce(new Error('Sem conexão'));
    advanceToStep2();
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    await waitFor(() => expect(screen.getByText(/sem conexão/i)).toBeInTheDocument());
  });
});

// ─── Step 3 — Payment status ──────────────────────────────────────────────────

describe('Checkout step 3 — approved', () => {
  it('shows success when status is approved', async () => {
    usePollingStatus.mockReturnValue({ status: 'approved', isPolling: false });
    criarPagamento.mockResolvedValueOnce({ id: 'MP_001', qrCode: 'c', qrCodeBase64: 'b' });
    renderCheckout([FOTO]);
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.change(screen.getByPlaceholderText(/DDD/i), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByText(/continuar/i));
    fireEvent.click(screen.getByText(/gerar qr pix/i));
    await waitFor(() => screen.getByText(/Pagamento confirmado/i));
    expect(screen.getByText(/Pagamento confirmado/i)).toBeInTheDocument();
  });
});
