import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import Header from '../components/layout/Header';

function renderHeader() {
  render(
    <BrowserRouter>
      <CarrinhoProvider><Header /></CarrinhoProvider>
    </BrowserRouter>
  );
}

it('renderiza navegacao institucional e carrinho', () => {
  renderHeader();
  expect(screen.getByLabelText(/paroquia sao rafael/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /eventos/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /carrinho/i })).toBeInTheDocument();
});
