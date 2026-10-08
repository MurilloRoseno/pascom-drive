import { fireEvent, render, screen } from '@testing-library/react';
import { fallbackTo } from '../lib/image-fallback';

it('troca a imagem que falhou pela de reserva uma unica vez', () => {
  render(<img src="/api/capa" alt="Capa" onError={fallbackTo('/assets/reserva.webp')} />);
  const image = screen.getByAltText('Capa');
  fireEvent.error(image);
  expect(image.getAttribute('src')).toBe('/assets/reserva.webp');
  image.setAttribute('src', '/outra');
  fireEvent.error(image);
  expect(image.getAttribute('src')).toBe('/outra');
});
