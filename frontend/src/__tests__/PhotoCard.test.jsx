import { render } from '@testing-library/react';
import PhotoCard from '../components/PhotoCard.jsx';

jest.mock('../hooks/useCarrinho.js', () => ({
  useCarrinho: () => ({
    isSelected: () => false,
    addFoto: jest.fn(),
    removeFoto: jest.fn(),
  }),
}));

const mockFoto = { id: 'F1', event: 'Missa', url: 'https://x.com/img.jpg', price: 25 };

it('renders photo as <img> tag with correct src', () => {
  const { container } = render(<PhotoCard foto={mockFoto} />);
  const img = container.querySelector('img');
  expect(img).not.toBeNull();
  expect(img.src).toContain(mockFoto.url);
});

it('prevents context menu on photo element', () => {
  const { container } = render(<PhotoCard foto={mockFoto} />);
  const img = container.querySelector('img');
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  img.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

it('mostra preview mas impede selecao sem autorizacao comercial', () => {
  const { getByRole, getByText } = render(
    <PhotoCard foto={{ ...mockFoto, availableForSale: false }} event={{ title: 'Missa', eventoId: 'EV1', salesAuthorized: false }} />
  );
  expect(getByRole('button')).toBeDisabled();
  expect(getByText(/compra indisponivel/i)).toBeInTheDocument();
});
