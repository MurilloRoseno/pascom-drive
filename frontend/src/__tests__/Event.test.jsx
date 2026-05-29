import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import EventPage from '../pages/Event';

jest.mock('../lib/api', () => ({
  obterEvento: jest.fn(),
  listarFotosEvento: jest.fn(),
  listarOfertasEvento: jest.fn(),
  validarAcessoGaleria: jest.fn(),
}));

const { obterEvento, listarFotosEvento, listarOfertasEvento } = require('../lib/api');

it('mantem no grid a indicacao da foto selecionada para compra', async () => {
  obterEvento.mockResolvedValue({
    event: {
      eventoId: 'EV1',
      title: 'Missa',
      category: 'celebracoes',
      publication: 'publicado',
      visibility: 'publica',
      salesAuthorized: true,
      date: '2026-05-26',
      time: '15:32',
    },
  });
  listarFotosEvento.mockResolvedValue({
    photos: [{ id: 'F1', previewUrl: '/foto.jpg', thumbnailUrl: '/foto.jpg', price: 10, availableForSale: true }],
  });
  listarOfertasEvento.mockResolvedValue({ offers: { coupons: [], packages: [] } });

  render(
    <MemoryRouter initialEntries={['/evento/EV1']}>
      <CarrinhoProvider>
        <Routes><Route path="/evento/:eventoId" element={<EventPage />} /></Routes>
      </CarrinhoProvider>
    </MemoryRouter>
  );

  const select = await screen.findByRole('button', { name: /selecionar foto/i });
  fireEvent.click(select);
  expect(screen.getByText('Selecionada')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /remover sele/i })).toBeInTheDocument();
});
