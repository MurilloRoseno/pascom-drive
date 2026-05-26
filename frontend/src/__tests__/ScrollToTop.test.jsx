import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import ScrollToTop from '../components/layout/ScrollToTop';

function TestRoutes() {
  return (
    <>
      <ScrollToTop />
      <Link to="/evento/EVENTO-1">Abrir evento</Link>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/evento/:id" element={<p>Evento</p>} />
      </Routes>
    </>
  );
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  it('moves to the top when navigating to another screen', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestRoutes />
      </MemoryRouter>,
    );

    window.scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: 'Abrir evento' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(screen.getByText('Evento')).toBeInTheDocument();
  });

  it('does not override deliberate section anchors', () => {
    render(
      <MemoryRouter initialEntries={['/#contato']}>
        <TestRoutes />
      </MemoryRouter>,
    );

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
