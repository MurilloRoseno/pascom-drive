import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import CheckoutPage from '../pages/Checkout';

jest.mock('../lib/api', () => ({
  cotarCheckout: jest.fn(),
  criarPagamento: jest.fn(),
}));

const { cotarCheckout, criarPagamento } = require('../lib/api');
const FOTO = { id: 'F1', eventoId: 'EV1', event: 'Missa', url: '/foto.jpg', price: 5 };
const PRICING = { subtotal: 5, serviceFee: 0.22, convenienceFee: 0.39, paymentCost: 0, total: 5.61, method: "credit_card", fees: { percentage: 3.99, fixed: 0.39 } };

function renderCheckout(fotos = [FOTO]) {
  return render(
    <MemoryRouter>
      <CarrinhoProvider initialFotos={fotos}>
        <CheckoutPage />
      </CarrinhoProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  cotarCheckout.mockReset().mockResolvedValue({ pricing: PRICING });
  criarPagamento.mockReset();
});

it('mostra estado vazio quando nao ha fotos', () => {
  renderCheckout([]);
  expect(screen.getByText(/carrinho esta vazio/i)).toBeInTheDocument();
});

it('mostra preco e taxas devolvidos pelo servidor', async () => {
  renderCheckout();
  await waitFor(() => expect(screen.getByText('R$ 5,61')).toBeInTheDocument());
  expect(screen.getByText(/taxa de servico/i)).toBeInTheDocument();
  expect(screen.getByText(/3,99% do valor no cart/i)).toBeInTheDocument();
  expect(screen.getByText(/valor fixo que o stripe cobra por transa/i)).toBeInTheDocument();
  expect(screen.queryByText(/custo estimado do pagamento/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/d.bito virtual/i)).not.toBeInTheDocument();
});

it('envia fotos, contato e metodo sem enviar total calculado no navegador', async () => {
  criarPagamento.mockReturnValue(new Promise(() => {}));
  renderCheckout();
  await waitFor(() => expect(screen.getByRole('button', { name: /pagar no stripe/i })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Maria Silva' } });
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'maria@example.com' } });
  fireEvent.change(screen.getByLabelText(/whatsapp/i), { target: { value: '99982061089' } });
  fireEvent.click(screen.getByRole('button', { name: /pagar no stripe/i }));
  expect(criarPagamento).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Maria Silva',
    email: 'maria@example.com',
    whatsapp: '99982061089',
    fotoIds: ['F1'],
    paymentMethod: 'pix',
  }));
  expect(criarPagamento.mock.calls[0][0]).not.toHaveProperty('total');
});

it('mantem pagamento bloqueado quando nao existe regra de taxa cadastrada', async () => {
  cotarCheckout.mockRejectedValueOnce(new Error('Pagamento indisponivel.'));
  renderCheckout();
  await screen.findByText(/pagamento indisponivel/i);
  expect(screen.getByRole('button', { name: /pagar no stripe/i })).toBeDisabled();
});
