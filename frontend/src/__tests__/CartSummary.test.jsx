import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CartSummary from '../components/CartSummary';

jest.mock('../hooks/useCarrinho.js', () => ({
  useCarrinho: jest.fn(),
}));

import { useCarrinho } from '../hooks/useCarrinho.js';

const mockCarrinho = (fotos) => ({
  fotos,
  addFoto: jest.fn(),
  removeFoto: jest.fn(),
  clearCarrinho: jest.fn(),
  isSelected: jest.fn(() => false),
});

function wrap(fotos) {
  useCarrinho.mockReturnValue(mockCarrinho(fotos));
  return render(
    <BrowserRouter>
      <CartSummary />
    </BrowserRouter>
  );
}

test('não renderiza quando carrinho está vazio', () => {
  const { container } = wrap([]);
  expect(container.firstChild).toBeNull();
});

test('renderiza barra quando há fotos no carrinho', () => {
  wrap([{ id: '1', event: 'Missa', url: '/img.jpg', price: 15 }]);
  expect(screen.getByText(/^1 foto$/i)).toBeInTheDocument();
  expect(screen.getByText(/subtotal confirmado no checkout/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument();
});

test('mostra contagem plural corretamente', () => {
  wrap([
    { id: '1', event: 'Missa', url: '/img.jpg', price: 15 },
    { id: '2', event: 'Missa', url: '/img2.jpg', price: 15 },
  ]);
  expect(screen.getByText(/^2 fotos$/i)).toBeInTheDocument();
});
