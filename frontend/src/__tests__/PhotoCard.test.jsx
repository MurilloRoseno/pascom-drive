import { render, fireEvent } from '@testing-library/react';
import PhotoCard from '../components/PhotoCard.jsx';

// Mock useCarrinho
jest.mock('../hooks/useCarrinho.js', () => ({
  useCarrinho: () => ({
    isSelected: () => false,
    addFoto: jest.fn(),
    removeFoto: jest.fn(),
  }),
}));

const mockFoto = { id: 'F1', event: 'Missa', url: 'https://x.com/img.jpg', price: 25 };

it('renders photo as background-image, not <img>', () => {
  const { container } = render(<PhotoCard foto={mockFoto} />);
  // Should NOT have an img element
  expect(container.querySelector('img')).toBeNull();
  // Should have a div with backgroundImage style (JSDOM serializes as background-image)
  const bgDiv = container.querySelector('.photo-blur-target');
  expect(bgDiv).not.toBeNull();
  expect(bgDiv.style.backgroundImage).toContain(mockFoto.url);
});

it('prevents context menu on photo div', () => {
  const { container } = render(<PhotoCard foto={mockFoto} />);
  const bgDiv = container.querySelector('.photo-blur-target');
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  bgDiv.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});
