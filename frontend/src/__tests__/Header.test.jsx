import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import Header from '../components/layout/Header';

function wrap(ui) {
  return render(
    <BrowserRouter>
      <CarrinhoProvider>{ui}</CarrinhoProvider>
    </BrowserRouter>
  );
}

test('não renderiza links de navegação para páginas inexistentes', () => {
  wrap(<Header />);
  expect(screen.queryByText(/sobre/i)).toBeNull();
  expect(screen.queryByText(/contato/i)).toBeNull();
});

test('renderiza nome da paróquia', () => {
  wrap(<Header />);
  expect(screen.getByText(/Paróquia São Rafael/i)).toBeInTheDocument();
});

test('mostra ícone de carrinho', () => {
  wrap(<Header />);
  expect(screen.getByLabelText(/carrinho/i)).toBeInTheDocument();
});

test('botão do carrinho está desabilitado quando vazio', () => {
  wrap(<Header />);
  const btn = screen.getByLabelText(/carrinho/i);
  expect(btn).toBeDisabled();
});
