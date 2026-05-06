import { render, screen, fireEvent } from '@testing-library/react';
import { CarrinhoProvider } from '../context/CarrinhoContext.jsx';
import { useCarrinho } from '../hooks/useCarrinho.js';

const FOTO_MOCK = { id: '1', price: 25, event: 'Teste', url: '' };

function TestComponent() {
  const { fotos, addFoto, removeFoto, clearCarrinho, isSelected, totais } = useCarrinho();
  return (
    <div>
      <span data-testid="count">{fotos.length}</span>
      <span data-testid="total">{totais.total.toFixed(2)}</span>
      <span data-testid="selected">{isSelected('1') ? 'sim' : 'nao'}</span>
      <button onClick={() => addFoto(FOTO_MOCK)}>add</button>
      <button onClick={() => removeFoto('1')}>remove</button>
      <button onClick={clearCarrinho}>clear</button>
    </div>
  );
}

const renderWithProvider = () =>
  render(<CarrinhoProvider><TestComponent /></CarrinhoProvider>);

describe('CarrinhoContext', () => {
  it('inicia vazio', () => {
    renderWithProvider();
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('selected').textContent).toBe('nao');
  });

  it('adiciona foto', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('selected').textContent).toBe('sim');
  });

  it('não duplica foto com mesmo id', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('remove foto', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('remove'));
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('limpa carrinho', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('calcula total corretamente', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('add'));
    // total = 25 + (25*0.0299 + 0.30) = 25 + 1.0475 = 26.0475
    expect(parseFloat(screen.getByTestId('total').textContent)).toBeCloseTo(26.05, 1);
  });
});
