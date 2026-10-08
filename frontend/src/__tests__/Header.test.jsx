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

it('renderiza navegacao institucional e CTA do site de referencia', () => {
  renderHeader();
  expect(screen.getByLabelText(/paróquia são rafael/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /eventos/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /doe agora/i })).toBeInTheDocument();
});
